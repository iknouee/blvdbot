const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const { createCanvas } = require("@napi-rs/canvas");
const { belovedEmbed, errorEmbed } = require("../../utils/embeds");
const family = require("../../systems/family");
const marriage = require("../../systems/marriage");

// ─── Layout Constants ───────────────────────────────────────────────────────────

const NODE_WIDTH = 160;
const NODE_HEIGHT = 50;
const H_GAP = 30;          // horizontal gap between siblings
const V_GAP = 80;          // vertical gap between generations
const COUPLE_GAP = 10;     // gap between married partners shown side by side
const PADDING = 40;        // canvas edge padding

const BG_COLOR = "#2b2d31";         // Discord dark theme bg
const NODE_COLOR = "#5865f2";       // Blurple
const SPOUSE_COLOR = "#eb459e";     // Fuchsia/pink for spouse nodes
const TEXT_COLOR = "#ffffff";
const LINE_COLOR = "#99aab5";
const BORDER_RADIUS = 12;

// ─── Tree Layout Engine ─────────────────────────────────────────────────────────

/**
 * Build a layout tree with positions for each node.
 * Each node: { id, username, spouse: { id, username } | null, children: [...], x, y, width }
 */
function buildLayoutTree(guildId, rootId, guild, memberCache) {
    const node = {
        id: rootId,
        username: memberCache.get(rootId) || "Unknown",
        spouse: null,
        children: [],
        x: 0,
        y: 0,
        width: NODE_WIDTH
    };

    // Check for spouse (marriage)
    const marriageData = marriage.get(guildId, rootId);
    if (marriageData) {
        node.spouse = {
            id: marriageData.partner_id,
            username: memberCache.get(marriageData.partner_id) || "Unknown"
        };
        node.width = NODE_WIDTH * 2 + COUPLE_GAP;
    }

    // Get children from family system
    const children = family.getChildren(guildId, rootId);

    // Also include spouse's children if they have any
    if (node.spouse) {
        const spouseChildren = family.getChildren(guildId, node.spouse.id);
        for (const sc of spouseChildren) {
            if (!children.includes(sc)) children.push(sc);
        }
    }

    for (const childId of children) {
        node.children.push(buildLayoutTree(guildId, childId, guild, memberCache));
    }

    return node;
}

/**
 * Assign X positions using a bottom-up approach.
 * Returns the total width of the subtree.
 */
function assignPositions(node, depth = 0) {
    node.y = depth * (NODE_HEIGHT + V_GAP);

    if (node.children.length === 0) {
        // Leaf node — width is just the node itself
        return node.width;
    }

    // Layout children first
    let totalChildWidth = 0;
    const childWidths = [];
    for (const child of node.children) {
        const w = assignPositions(child, depth + 1);
        childWidths.push(w);
        totalChildWidth += w;
    }
    totalChildWidth += H_GAP * (node.children.length - 1);

    // The subtree width is the max of the node width and children width
    const subtreeWidth = Math.max(node.width, totalChildWidth);

    // Center children under this node
    let startX = (subtreeWidth - totalChildWidth) / 2;
    for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const childSubtreeWidth = childWidths[i];
        child.x = startX + childSubtreeWidth / 2 - child.width / 2;
        offsetTree(child, startX + childSubtreeWidth / 2 - child.width / 2 - child.x);
        startX += childSubtreeWidth + H_GAP;
    }

    // Center this node above its children
    node.x = (subtreeWidth - node.width) / 2;

    return subtreeWidth;
}

function offsetTree(node, dx) {
    node.x += dx;
    for (const child of node.children) {
        offsetTree(child, dx);
    }
}

/**
 * Normalize all positions so minimum x is 0.
 */
function normalizePositions(node) {
    const allNodes = flattenTree(node);
    const minX = Math.min(...allNodes.map(n => n.x));
    const minY = Math.min(...allNodes.map(n => n.y));
    for (const n of allNodes) {
        n.x -= minX;
        n.y -= minY;
    }
    return allNodes;
}

function flattenTree(node) {
    const result = [node];
    for (const child of node.children) {
        result.push(...flattenTree(child));
    }
    return result;
}

// ─── Canvas Drawing ─────────────────────────────────────────────────────────────

function drawRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function truncateText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    while (ctx.measureText(text + "…").width > maxWidth && text.length > 0) {
        text = text.slice(0, -1);
    }
    return text + "…";
}

function drawNode(ctx, x, y, username, color) {
    // Shadow
    ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Background
    drawRoundedRect(ctx, x, y, NODE_WIDTH, NODE_HEIGHT, BORDER_RADIUS);
    ctx.fillStyle = color;
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Text
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = truncateText(ctx, username, NODE_WIDTH - 20);
    ctx.fillText(label, x + NODE_WIDTH / 2, y + NODE_HEIGHT / 2);
}

function drawCoupleNode(ctx, node) {
    const x = node.x + PADDING;
    const y = node.y + PADDING;

    // Draw main user node
    drawNode(ctx, x, y, node.username, NODE_COLOR);

    if (node.spouse) {
        // Draw spouse node
        const spouseX = x + NODE_WIDTH + COUPLE_GAP;
        drawNode(ctx, spouseX, y, node.spouse.username, SPOUSE_COLOR);

        // Draw heart/connection between couple
        ctx.strokeStyle = SPOUSE_COLOR;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x + NODE_WIDTH, y + NODE_HEIGHT / 2);
        ctx.lineTo(spouseX, y + NODE_HEIGHT / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Heart emoji in the middle
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("💍", x + NODE_WIDTH + COUPLE_GAP / 2, y + NODE_HEIGHT / 2);
    }
}

function drawConnections(ctx, node) {
    if (node.children.length === 0) return;

    const parentCenterX = node.x + PADDING + node.width / 2;
    const parentBottomY = node.y + PADDING + NODE_HEIGHT;

    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);

    // Draw vertical line down from parent
    const midY = parentBottomY + V_GAP / 2;
    ctx.beginPath();
    ctx.moveTo(parentCenterX, parentBottomY);
    ctx.lineTo(parentCenterX, midY);
    ctx.stroke();

    if (node.children.length === 1) {
        // Single child — straight line down
        const child = node.children[0];
        const childCenterX = child.x + PADDING + child.width / 2;
        const childTopY = child.y + PADDING;

        ctx.beginPath();
        ctx.moveTo(parentCenterX, midY);
        ctx.lineTo(childCenterX, midY);
        ctx.lineTo(childCenterX, childTopY);
        ctx.stroke();
    } else {
        // Multiple children — horizontal bar + vertical drops
        const childXPositions = node.children.map(c => c.x + PADDING + c.width / 2);
        const leftX = Math.min(...childXPositions);
        const rightX = Math.max(...childXPositions);

        // Horizontal bar
        ctx.beginPath();
        ctx.moveTo(leftX, midY);
        ctx.lineTo(rightX, midY);
        ctx.stroke();

        // Vertical drops to each child
        for (const child of node.children) {
            const childCenterX = child.x + PADDING + child.width / 2;
            const childTopY = child.y + PADDING;
            ctx.beginPath();
            ctx.moveTo(childCenterX, midY);
            ctx.lineTo(childCenterX, childTopY);
            ctx.stroke();
        }
    }

    // Recurse into children
    for (const child of node.children) {
        drawConnections(ctx, child);
    }
}

function renderTree(layoutTree) {
    // Assign positions
    const totalWidth = assignPositions(layoutTree);
    normalizePositions(layoutTree);

    // Calculate canvas size
    const allNodes = flattenTree(layoutTree);
    const maxX = Math.max(...allNodes.map(n => n.x + n.width));
    const maxY = Math.max(...allNodes.map(n => n.y + NODE_HEIGHT));

    const canvasWidth = Math.max(400, maxX + PADDING * 2);
    const canvasHeight = Math.max(200, maxY + PADDING * 2);

    // Create canvas
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext("2d");

    // Background
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw title
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText("Family Tree • Beloved Bot", canvasWidth - 12, 10);

    // Draw connections first (behind nodes)
    drawConnections(ctx, layoutTree);

    // Draw all nodes
    for (const node of allNodes) {
        drawCoupleNode(ctx, node);
    }

    return canvas.toBuffer("image/png");
}

// ─── Command ────────────────────────────────────────────────────────────────────

module.exports = {
    data: new SlashCommandBuilder()
        .setName("familytree")
        .setDescription("View your family tree as an image")
        .addUserOption(opt => opt.setName("user").setDescription("View someone else's family tree").setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getUser("user") || interaction.user;
        const guildId = interaction.guild.id;

        // Check if user has any family connections
        const member = family.getMember(guildId, target.id);
        const marriageData = marriage.get(guildId, target.id);

        if (!member && !marriageData) {
            return interaction.reply({
                embeds: [errorEmbed(`<@${target.id}> has no family yet! Use \`/adopt\` or \`/marry\` to start one.`)],
                ephemeral: true
            });
        }

        // Check if they have at least some relationship
        const hasFamily = (member && (member.parent_id || member.children.length > 0)) || marriageData;
        if (!hasFamily) {
            return interaction.reply({
                embeds: [errorEmbed(`<@${target.id}> has no family yet! Use \`/adopt\` or \`/marry\` to start one.`)],
                ephemeral: true
            });
        }

        await interaction.deferReply();

        try {
            // Find root of the family tree
            const rootId = family.findRoot(guildId, target.id);

            // Collect all member IDs we need to resolve usernames for
            const allMemberIds = family.getAllMembers(guildId, rootId);

            // Also add the root itself if not already included
            if (!allMemberIds.includes(rootId)) allMemberIds.push(rootId);

            // Add spouses to the member list
            for (const memberId of [...allMemberIds]) {
                const m = marriage.get(guildId, memberId);
                if (m && !allMemberIds.includes(m.partner_id)) {
                    allMemberIds.push(m.partner_id);
                }
            }

            // Fetch usernames
            const memberCache = new Map();
            const guild = interaction.guild;
            for (const memberId of allMemberIds) {
                try {
                    const guildMember = await guild.members.fetch(memberId);
                    memberCache.set(memberId, guildMember.displayName);
                } catch {
                    memberCache.set(memberId, `User ${memberId.slice(-4)}`);
                }
            }

            // Build layout tree
            const layoutTree = buildLayoutTree(guildId, rootId, guild, memberCache);

            // Render to image
            const imageBuffer = renderTree(layoutTree);

            // Create attachment
            const attachment = new AttachmentBuilder(imageBuffer, { name: "family-tree.png" });

            const embed = belovedEmbed("🌳 Family Tree")
                .setDescription(`Family tree for <@${target.id}>`)
                .setImage("attachment://family-tree.png")
                .setFooter({ text: `${allMemberIds.length} family member${allMemberIds.length !== 1 ? "s" : ""} • 💍 = married` });

            await interaction.editReply({ embeds: [embed], files: [attachment] });
        } catch (error) {
            await interaction.editReply({
                embeds: [errorEmbed("Failed to generate family tree image. Please try again later.")]
            });
        }
    }
};

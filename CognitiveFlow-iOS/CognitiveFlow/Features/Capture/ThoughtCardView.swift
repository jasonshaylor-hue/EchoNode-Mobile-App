// CognitiveFlow-iOS/CognitiveFlow/Features/Capture/ThoughtCardView.swift
import SwiftUI

struct ThoughtCardView: View {
    let thought: CapturedThought

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            // Header: category badge + timestamp
            HStack {
                CategoryBadge(category: thought.category)
                Spacer()
                Text(thought.createdAt, style: .relative)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            // Cleaned text
            Text(thought.cleanedText)
                .font(.subheadline)
                .foregroundStyle(.primary)
                .lineLimit(3)

            // Intent (purpose summary)
            if !thought.intent.isEmpty {
                Text(thought.intent)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .italic()
            }

            // Hierarchy tree preview
            if let children = thought.hierarchy.children, !children.isEmpty {
                Divider()
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(children.prefix(3)) { child in
                        HStack(spacing: 6) {
                            Image(systemName: nodeIcon(for: child.type))
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                            Text(child.title)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                            Spacer()
                            PriorityBadge(priority: child.priority)
                        }
                    }
                    if children.count > 3 {
                        Text("+ \(children.count - 3) more")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                }
            }

            // Tags
            if !thought.tags.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(thought.tags, id: \.self) { tag in
                            Text("#\(tag)")
                                .font(.caption2)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Color.accentColor.opacity(0.12))
                                .foregroundStyle(Color.accentColor)
                                .clipShape(Capsule())
                        }
                    }
                }
            }
        }
        .padding(14)
        .glassCard()
    }

    private func nodeIcon(for type: ProjectNode.NodeType) -> String {
        switch type {
        case .project:  return "folder"
        case .task:     return "checkmark.square"
        case .subtask:  return "arrow.turn.down.right"
        case .note:     return "note.text"
        }
    }
}

private struct CategoryBadge: View {
    let category: ThoughtCategory

    private var color: Color {
        switch category {
        case .task:      return .blue
        case .idea:      return .purple
        case .reference: return .orange
        }
    }

    var body: some View {
        Text(category.rawValue.uppercased())
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(color.opacity(0.15))
            .foregroundStyle(color)
            .clipShape(Capsule())
    }
}

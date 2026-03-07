// CognitiveFlow-iOS/CognitiveFlow/Features/Focus/TaskCardView.swift
import SwiftUI

struct TaskCardView: View {
    let task: AppTask
    let isCompleted: Bool
    let onComplete: (UUID) -> Void

    var body: some View {
        HStack(spacing: 12) {
            // Checkmark button
            Button {
                if !isCompleted { onComplete(task.id) }
            } label: {
                Image(systemName: isCompleted ? "checkmark.circle.fill" : "circle")
                    .font(.title2)
                    .foregroundStyle(isCompleted ? .green : Color(.tertiaryLabel))
            }
            .buttonStyle(.plain)
            .accessibilityLabel(isCompleted ? "Completed" : "Mark as complete")

            // Task content
            VStack(alignment: .leading, spacing: 4) {
                Text(task.title)
                    .font(.subheadline)
                    .foregroundStyle(isCompleted ? .secondary : .primary)
                    .strikethrough(isCompleted)
                    .lineLimit(2)

                HStack(spacing: 8) {
                    PriorityBadge(priority: task.priority)

                    if task.mentionCount > 1 {
                        Text("×\(task.mentionCount)")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }

                    if isCompleted, let completedAt = task.completedAt {
                        Text(completedAt, style: .relative)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            Spacer()
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
    }
}

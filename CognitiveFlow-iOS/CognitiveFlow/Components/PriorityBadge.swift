// CognitiveFlow-iOS/CognitiveFlow/Components/PriorityBadge.swift
import SwiftUI

struct PriorityBadge: View {
    let priority: TaskPriority

    private var color: Color {
        switch priority {
        case .high:   return Color(red: 0.8, green: 0.2, blue: 0.2)
        case .medium: return Color(red: 0.8, green: 0.6, blue: 0.1)
        case .low:    return Color(red: 0.3, green: 0.6, blue: 0.4)
        }
    }

    var body: some View {
        Text(priority.rawValue.uppercased())
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(color.opacity(0.15))
            .foregroundStyle(color)
            .clipShape(Capsule())
    }
}

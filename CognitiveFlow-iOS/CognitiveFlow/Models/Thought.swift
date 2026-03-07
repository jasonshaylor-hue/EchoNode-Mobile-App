// CognitiveFlow-iOS/CognitiveFlow/Models/Thought.swift
import Foundation

enum ThoughtCategory: String, Codable, CaseIterable {
    case task = "Task"
    case idea = "Idea"
    case reference = "Reference"
}

struct ProjectNode: Codable, Identifiable {
    var id: UUID = UUID()  // local-only ID for SwiftUI iteration
    let title: String
    let type: NodeType
    let priority: TaskPriority
    let children: [ProjectNode]?

    enum NodeType: String, Codable {
        case project, task, subtask, note
    }

    private enum CodingKeys: String, CodingKey {
        case title, type, priority, children
    }
}

struct CapturedThought: Codable, Identifiable {
    let id: UUID
    let rawText: String
    let cleanedText: String
    let category: ThoughtCategory
    let intent: String
    let hierarchy: ProjectNode
    let createdAt: Date
    let userId: UUID
    var tags: [String]

    enum CodingKeys: String, CodingKey {
        case id
        case rawText = "raw_text"
        case cleanedText = "cleaned_text"
        case category, intent, hierarchy
        case createdAt = "created_at"
        case userId = "user_id"
        case tags
    }
}

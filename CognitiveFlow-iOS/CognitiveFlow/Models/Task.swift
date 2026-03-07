// CognitiveFlow-iOS/CognitiveFlow/Models/Task.swift
import Foundation

enum TaskPriority: String, Codable, Comparable, CaseIterable {
    case high, medium, low

    private static let order: [TaskPriority] = [.high, .medium, .low]

    static func < (lhs: TaskPriority, rhs: TaskPriority) -> Bool {
        order.firstIndex(of: lhs)! < order.firstIndex(of: rhs)!
    }
}

enum TaskStatus: String, Codable {
    case open, done
}

// Named AppTask to avoid conflict with Swift Concurrency's `Task`
struct AppTask: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    let thoughtId: UUID?
    let title: String
    let priority: TaskPriority
    var status: TaskStatus
    let mentionCount: Int
    let createdAt: Date
    var completedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case thoughtId = "thought_id"
        case title, priority, status
        case mentionCount = "mention_count"
        case createdAt = "created_at"
        case completedAt = "completed_at"
    }
}

struct NextTaskResult {
    let task: AppTask?
    let rationale: String
}

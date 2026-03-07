// CognitiveFlow-iOS/CognitiveFlowTests/Models/TaskTests.swift
import XCTest
@testable import CognitiveFlow

final class TaskTests: XCTestCase {

    func test_taskPriority_ordering() {
        XCTAssertGreaterThan(TaskPriority.high, TaskPriority.medium)
        XCTAssertGreaterThan(TaskPriority.medium, TaskPriority.low)
    }

    func test_task_decodesFromJSON() throws {
        let json = """
        {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "user_id": "660e8400-e29b-41d4-a716-446655440001",
            "thought_id": null,
            "title": "Email Sarah",
            "priority": "high",
            "status": "open",
            "mention_count": 3,
            "created_at": "2026-03-06T10:00:00Z",
            "completed_at": null
        }
        """
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let task = try decoder.decode(AppTask.self, from: Data(json.utf8))
        XCTAssertEqual(task.title, "Email Sarah")
        XCTAssertEqual(task.priority, .high)
        XCTAssertEqual(task.status, .open)
        XCTAssertEqual(task.mentionCount, 3)
        XCTAssertNil(task.completedAt)
    }
}

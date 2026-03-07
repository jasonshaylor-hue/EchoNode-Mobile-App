// CognitiveFlow-iOS/CognitiveFlowTests/Models/ThoughtTests.swift
import XCTest
@testable import CognitiveFlow

final class ThoughtTests: XCTestCase {

    func test_thoughtCategory_rawValues() {
        XCTAssertEqual(ThoughtCategory.task.rawValue, "Task")
        XCTAssertEqual(ThoughtCategory.idea.rawValue, "Idea")
        XCTAssertEqual(ThoughtCategory.reference.rawValue, "Reference")
    }

    func test_projectNode_decodesFromJSON() throws {
        let json = """
        {
            "title": "Write quarterly report",
            "type": "task",
            "priority": "high",
            "children": []
        }
        """
        let node = try JSONDecoder().decode(ProjectNode.self, from: Data(json.utf8))
        XCTAssertEqual(node.title, "Write quarterly report")
        XCTAssertEqual(node.type, .task)
        XCTAssertEqual(node.priority, .high)
        XCTAssertTrue(node.children?.isEmpty ?? true)
    }

    func test_projectNode_decodesNestedChildren() throws {
        let json = """
        {
            "title": "Q4 Report",
            "type": "project",
            "priority": "high",
            "children": [
                {"title": "Draft outline", "type": "task", "priority": "medium", "children": null}
            ]
        }
        """
        let node = try JSONDecoder().decode(ProjectNode.self, from: Data(json.utf8))
        XCTAssertEqual(node.children?.count, 1)
        XCTAssertEqual(node.children?.first?.title, "Draft outline")
    }
}

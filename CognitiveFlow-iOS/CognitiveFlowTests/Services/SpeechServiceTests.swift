// CognitiveFlow-iOS/CognitiveFlowTests/Services/SpeechServiceTests.swift
import XCTest
@testable import CognitiveFlow

// Note: AVSpeechRecognizer can't be fully tested in unit tests (requires device/permissions).
// We test the observable state machine logic.
@MainActor
final class SpeechServiceTests: XCTestCase {

    func test_initialState_isNotListening() {
        let service = SpeechService()
        XCTAssertFalse(service.isListening)
        XCTAssertEqual(service.transcribedText, "")
        XCTAssertNil(service.errorMessage)
    }

    func test_stopListening_whenNotStarted_doesNotCrash() {
        let service = SpeechService()
        service.stopListening()  // Should not crash
        XCTAssertFalse(service.isListening)
    }
}

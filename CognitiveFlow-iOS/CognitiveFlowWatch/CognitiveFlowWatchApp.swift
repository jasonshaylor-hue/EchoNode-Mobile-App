// CognitiveFlow-iOS/CognitiveFlowWatch/CognitiveFlowWatchApp.swift
import SwiftUI

@main
struct CognitiveFlowWatchApp: App {
    @State private var sessionManager = WatchSessionManager.shared

    var body: some Scene {
        WindowGroup {
            WatchRootView()
                .environment(sessionManager)
        }
    }
}

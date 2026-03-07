// CognitiveFlow-iOS/CognitiveFlow/CognitiveFlowApp.swift
import SwiftUI

@main
struct CognitiveFlowApp: App {
    @State private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(appState)
        }
    }
}

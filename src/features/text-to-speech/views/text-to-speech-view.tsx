"use client";
import { SettingsPanel } from "../components/settings-panel";
import { TextInputPanel } from "../components/text-input-panel";
import { defaultTTSValues, TextToSpeechForm } from "../components/text-to-speech-form";
import { VoicePreviewPlaceholder } from "../components/voice-preview-placeholder";


export function TextToSpeechView() {
    return (
        <TextToSpeechForm defaultValues={defaultTTSValues}>
            <div className="flex min-h-0 flex-1 overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col">
                <TextInputPanel/>
                <VoicePreviewPlaceholder/>
            </div>
            <SettingsPanel/>
        </div>
        </TextToSpeechForm>
        
    )
}
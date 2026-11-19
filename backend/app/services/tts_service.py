import base64
import io
import re
import logging
import edge_tts

logger = logging.getLogger(__name__)

# Microsoft Natural Neural Voices for Indian English & Hindi
# hi-IN-SwaraNeural: Warm, expressive Indian female voice (perfect for Hindi & Hinglish)
# en-IN-NeerjaNeural: Natural Indian English female voice
DEFAULT_VOICE = "hi-IN-SwaraNeural"

async def synthesize_speech_base64(text: str, voice: str = DEFAULT_VOICE) -> str:
    """
    Synthesizes conversational dialogue to a high-fidelity MP3 Base64 data URI.
    Uses Microsoft Natural Neural Voice (Human-like tone, zero robotic artifacts).
    Returned Base64 string plays instantly across Chrome, Edge, Safari, Firefox, and mobile.
    """
    clean_text = re.sub(r'[*_#`]', '', text).strip()
    if not clean_text:
        return ""

    try:
        communicate = edge_tts.Communicate(clean_text, voice, rate="+2%", pitch="+1Hz")
        mp3_buffer = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                mp3_buffer.write(chunk["data"])

        audio_bytes = mp3_buffer.getvalue()
        if not audio_bytes:
            return ""

        b64_data = base64.b64encode(audio_bytes).decode("utf-8")
        return f"data:audio/mp3;base64,{b64_data}"
    except Exception as e:
        logger.error(f"[TTS] Edge-TTS synthesis failed: {e}")
        return ""

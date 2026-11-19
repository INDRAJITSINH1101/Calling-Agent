import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { leadsApi } from '../services/leadsApi';
import { callsApi } from '../services/callsApi';
import { telephonyApi } from '../services/telephonyApi';
import { useSystemConstants } from '../hooks/useSystemConstants';
import { Lead } from '../types/crm';
import { TranscriptItem, CallEndResponse } from '../types/calls';
import {
  DialerControl,
  ConversationalStage,
  CallSummaryModal
} from '../components/calling';

export const CallingAgentPage: React.FC = () => {
  // System Constants for Personas (Centralized from Backend/Hook)
  const { callingPersonas } = useSystemConstants();

  // Leads & Selection State
  const queryClient = useQueryClient();

  // Load real leads from API using TanStack Query with in-memory caching
  const { data: leadsData } = useQuery({
    queryKey: ['callingLeads'],
    queryFn: () => leadsApi.getLeads(1, 100),
    staleTime: 1000 * 60 * 5, // 5 minutes cache prevents duplicate requests on tab clicks
    refetchOnWindowFocus: false
  });

  const leads: Lead[] = leadsData?.leads || [];
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [dialPhoneNumber, setDialPhoneNumber] = useState<string>('+919898603098');
  const [selectedPersona, setSelectedPersona] = useState<string>('RACHEL_ENTERPRISE');

  // Phase 8: Real Telecom PSTN (Twilio) State
  const [callChannel, setCallChannel] = useState<'browser' | 'pstn'>('pstn');
  const [isPstnRinging, setIsPstnRinging] = useState<boolean>(false);
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const monitorWsRef = useRef<WebSocket | null>(null);

  // Fetch live Twilio status
  const { data: twilioConfig, refetch: refetchTwilio } = useQuery({
    queryKey: ['liveTelephonyStatus'],
    queryFn: () => telephonyApi.getLiveStatus(),
    staleTime: 1000 * 30
  });

  useEffect(() => {
    if (twilioConfig?.webhook_base_url && !webhookUrl) {
      setWebhookUrl(twilioConfig.webhook_base_url);
    }
  }, [twilioConfig, webhookUrl]);

  const handleSaveWebhookUrl = async () => {
    if (!webhookUrl.trim()) return;
    try {
      await telephonyApi.setWebhookUrl(webhookUrl.trim());
      await refetchTwilio();
      alert('Public Webhook Tunnel URL saved successfully!');
    } catch (err: any) {
      alert(`Failed to save webhook URL: ${err.message}`);
    }
  };

  // Auto-Dialer Queue Campaign State
  const [isQueueMode, setIsQueueMode] = useState<boolean>(false);
  const [isQueueRunning, setIsQueueRunning] = useState<boolean>(false);
  const [queueCompletedIds, setQueueCompletedIds] = useState<number[]>([]);
  const [selectedQueueLeadIds, setSelectedQueueLeadIds] = useState<number[]>([]);
  const [nextCallCountdown, setNextCallCountdown] = useState<number | null>(null);

  const isQueueRunningRef = useRef(isQueueRunning);
  const queueCompletedIdsRef = useRef(queueCompletedIds);
  const selectedQueueLeadIdsRef = useRef(selectedQueueLeadIds);
  const countdownIntervalRef = useRef<any>(null);
  const currentLeadIdRef = useRef<number | null>(null);

  useEffect(() => {
    isQueueRunningRef.current = isQueueRunning;
  }, [isQueueRunning]);

  useEffect(() => {
    queueCompletedIdsRef.current = queueCompletedIds;
  }, [queueCompletedIds]);

  useEffect(() => {
    selectedQueueLeadIdsRef.current = selectedQueueLeadIds;
  }, [selectedQueueLeadIds]);

  // Active Call State
  const [isCallActive, setIsCallActive] = useState<boolean>(false);
  const [activeCallId, setActiveCallId] = useState<number | null>(null);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState<boolean>(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState<boolean>(false);
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [userInputText, setUserInputText] = useState<string>('');
  const [isProcessingTurn, setIsProcessingTurn] = useState<boolean>(false);

  // Post-Call Summary Modal
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [callSummary, setCallSummary] = useState<CallEndResponse | null>(null);

  // Audio & Speech Synthesis/Recognition refs
  const timerRef = useRef<any>(null);
  const callStartTimeRef = useRef<number>(0);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const userMicStreamRef = useRef<MediaStream | null>(null);
  const micSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mixedDestNodeRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  // Stable state refs to prevent SpeechRecognition teardown and race conditions
  const isCallActiveRef = useRef(isCallActive);
  const isAgentSpeakingRef = useRef(isAgentSpeaking);
  const isMicMutedRef = useRef(isMicMuted);
  const activeCallIdRef = useRef(activeCallId);
  const isProcessingTurnRef = useRef(isProcessingTurn);
  const transcriptsRef = useRef(transcripts);
  const sendTurnRef = useRef<(msg: string) => void>(() => {});

  useEffect(() => {
    isCallActiveRef.current = isCallActive;
  }, [isCallActive]);

  useEffect(() => {
    isAgentSpeakingRef.current = isAgentSpeaking;
  }, [isAgentSpeaking]);

  useEffect(() => {
    isMicMutedRef.current = isMicMuted;
  }, [isMicMuted]);

  useEffect(() => {
    activeCallIdRef.current = activeCallId;
  }, [activeCallId]);

  useEffect(() => {
    isProcessingTurnRef.current = isProcessingTurn;
  }, [isProcessingTurn]);

  useEffect(() => {
    transcriptsRef.current = transcripts;
  }, [transcripts]);

  // Fallback PSTN poll to detect when call is disconnected from mobile device
  useEffect(() => {
    if (!activeCallId || (!isCallActive && !isPstnRinging)) return;

    const interval = setInterval(async () => {
      try {
        const hist = await callsApi.getCallHistory({ pageSize: 1 });
        const latest = hist?.items?.[0];
        if (latest && latest.id === activeCallId) {
          const st = (latest.status || '').toUpperCase();
          if (['COMPLETED', 'FAILED', 'BUSY', 'NO_ANSWER', 'CANCELED'].includes(st)) {
            setIsPstnRinging(false);
            setIsCallActive(false);
            isCallActiveRef.current = false;
            if (timerRef.current) clearInterval(timerRef.current);
            queryClient.invalidateQueries({ queryKey: ['callHistory'] });
            queryClient.invalidateQueries({ queryKey: ['recordingsLibrary'] });
          }
        }
      } catch (_) {}
    }, 2000);

    return () => clearInterval(interval);
  }, [activeCallId, isCallActive, isPstnRinging, queryClient]);

  // Audio Recording Helper - Captures BOTH User Mic AND AI Voice (Full Dual-Side Recording)
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
      
      // 1. Get user microphone stream
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      userMicStreamRef.current = micStream;

      // 2. Obtain or resume shared AudioContext for mixing
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!(window as any).__sharedAudioCtx) {
        (window as any).__sharedAudioCtx = new AudioCtx();
      }
      const ctx = (window as any).__sharedAudioCtx as AudioContext;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // 3. Create destination node that mixes mic + AI audio
      const mixedDest = ctx.createMediaStreamDestination();
      mixedDestNodeRef.current = mixedDest;

      // 4. Connect user mic to mixed destination (NOT to ctx.destination to avoid hearing own mic)
      const micSource = ctx.createMediaStreamSource(micStream);
      micSource.connect(mixedDest);
      micSourceNodeRef.current = micSource;

      // 5. Setup MediaRecorder on the combined stream
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(mixedDest.stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      recorder.start(1000); // 1-second chunks
      mediaRecorderRef.current = recorder;
    } catch (err) {
      console.warn('Could not initialize dual-channel audio recording:', err);
    }
  };

  const stopAndUploadRecording = async (callId: number) => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (userMicStreamRef.current) {
        userMicStreamRef.current.getTracks().forEach(t => t.stop());
        userMicStreamRef.current = null;
      }
      if (micSourceNodeRef.current) {
        try {
          micSourceNodeRef.current.disconnect();
        } catch (_) {}
        micSourceNodeRef.current = null;
      }
      mixedDestNodeRef.current = null;

      setTimeout(async () => {
        if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          if (blob.size > 100) {
            try {
              await callsApi.uploadRecording(callId, blob);
              queryClient.invalidateQueries({ queryKey: ['callHistory'] });
              queryClient.invalidateQueries({ queryKey: ['recordingsLibrary'] });
            } catch (uploadErr) {
              console.warn('Failed to upload call recording:', uploadErr);
            }
          }
        }
      }, 500);
    } catch (e) {
      console.warn('Error stopping audio recorder:', e);
    }
  };

  // Safe helper to start recognition
  const startListening = () => {
    if (!recognitionRef.current || !isCallActiveRef.current || isMicMutedRef.current || isAgentSpeakingRef.current) return;
    try {
      recognitionRef.current.start();
    } catch (_) {
      // recognition may already be active or starting
    }
  };

  // Safe helper to stop recognition
  const stopListening = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (_) {}
  };

  // Initialize selected lead once leads load
  useEffect(() => {
    if (leads.length > 0 && !selectedLeadId) {
      setSelectedLeadId(String(leads[0].id));
      setDialPhoneNumber(leads[0].contact?.phone || '');
    }
  }, [leads, selectedLeadId]);

  // Auto-sync selected persona with dynamic database personas from Training Studio
  useEffect(() => {
    if (callingPersonas && callingPersonas.length > 0) {
      if (!callingPersonas.some(p => p.value === selectedPersona)) {
        setSelectedPersona(callingPersonas[0].value);
      }
    }
  }, [callingPersonas, selectedPersona]);

  const handleLeadChange = (lId: string) => {
    setSelectedLeadId(lId);
    const chosen = leads.find(l => String(l.id) === lId);
    if (chosen?.contact?.phone) {
      setDialPhoneNumber(chosen.contact.phone);
    }
  };

  // Sync selected queue leads when pipeline leads load
  useEffect(() => {
    if (leads.length > 0) {
      setSelectedQueueLeadIds(prev => {
        if (prev.length === 0) {
          return leads.map(l => l.id);
        }
        // Retain currently selected that still exist in leads
        const validIds = prev.filter(id => leads.some(l => l.id === id));
        return validIds.length > 0 ? validIds : leads.map(l => l.id);
      });
    }
  }, [leads]);

  // Lead selection toggle handlers for Auto Queue
  const handleToggleSelectLead = (leadId: number) => {
    if (isQueueRunningRef.current || isCallActiveRef.current) return;
    setSelectedQueueLeadIds(prev =>
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  const handleToggleSelectAll = () => {
    if (isQueueRunningRef.current || isCallActiveRef.current) return;
    if (selectedQueueLeadIds.length === leads.length) {
      setSelectedQueueLeadIds([]);
    } else {
      setSelectedQueueLeadIds(leads.map(l => l.id));
    }
  };

  // Auto-scroll transcript container
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // Call Duration Timer - Precise Timestamp-Based Elapsed Time
  useEffect(() => {
    if (isCallActive) {
      callStartTimeRef.current = Date.now();
      setCallDuration(0);
      timerRef.current = setInterval(() => {
        if (callStartTimeRef.current > 0) {
          const elapsed = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
          setCallDuration(elapsed);
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isCallActive]);


  // Synchronously unlock browser audio context on user gesture (Bypasses Chrome & Edge Autoplay Policy)
  const unlockBrowserAudio = () => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        if (!(window as any).__sharedAudioCtx) {
          (window as any).__sharedAudioCtx = new AudioCtx();
        }
        if ((window as any).__sharedAudioCtx.state === 'suspended') {
          (window as any).__sharedAudioCtx.resume();
        }
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.resume();
      }
    } catch (_) {}
  };

  // High-Fidelity Neural Voice Player (Plays Base64 Neural Audio across Chrome, Edge, Safari, Mobile)
  const speakText = (text: string, base64Audio?: string) => {
    const cleanText = text.replace(/[*_#`]/g, '').trim();
    if (!cleanText) return;

    // 1. Stop any currently playing audio
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
      } catch (_) {}
      activeAudioRef.current = null;
    }

    isAgentSpeakingRef.current = true;
    setIsAgentSpeaking(true);
    stopListening();

    let hasEnded = false;
    const finishSpeech = () => {
      if (hasEnded) return;
      hasEnded = true;
      activeAudioRef.current = null;
      isAgentSpeakingRef.current = false;
      setIsAgentSpeaking(false);
      if (isCallActiveRef.current && !isMicMutedRef.current) {
        startListening();
      }
    };

    // 1. Play high-fidelity Neural MP3 audio via Web Audio API (100% Autoplay-Proof in Chrome & Edge)
    if (base64Audio) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          if (!(window as any).__sharedAudioCtx) {
            (window as any).__sharedAudioCtx = new AudioCtx();
          }
          const ctx = (window as any).__sharedAudioCtx as AudioContext;
          if (ctx.state === 'suspended') {
            ctx.resume();
          }

          const base64Data = base64Audio.includes(',') ? base64Audio.split(',')[1] : base64Audio;
          const binaryStr = window.atob(base64Data);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }

          ctx.decodeAudioData(
            bytes.buffer.slice(0),
            (decodedBuffer) => {
              const source = ctx.createBufferSource();
              source.buffer = decodedBuffer;
              // User hears AI via speakers/headphones
              source.connect(ctx.destination);
              // Pipe AI speech directly into the call recording stream!
              if (mixedDestNodeRef.current) {
                try {
                  source.connect(mixedDestNodeRef.current);
                } catch (_) {}
              }
              source.onended = finishSpeech;
              source.start(0);
            },
            () => {
              fallbackHtml5Audio(base64Audio, cleanText, finishSpeech);
            }
          );
          return;
        }
      } catch (e) {
        console.warn('[TTS] Web Audio init error, trying HTML5 Audio fallback:', e);
      }
      fallbackHtml5Audio(base64Audio, cleanText, finishSpeech);
      return;
    }

    // Fallback to browser speech synthesis
    fallbackBrowserSpeech(cleanText, finishSpeech);
  };

  const fallbackHtml5Audio = (base64Audio: string, cleanText: string, onDone: () => void) => {
    try {
      const audio = new Audio(base64Audio);
      audio.preload = 'auto';
      audio.volume = 1.0;
      activeAudioRef.current = audio;
      audio.onended = onDone;
      audio.onerror = () => fallbackBrowserSpeech(cleanText, onDone);

      // Connect HTML5 audio to mixed destination if available
      if (mixedDestNodeRef.current && (window as any).__sharedAudioCtx) {
        try {
          const ctx = (window as any).__sharedAudioCtx as AudioContext;
          const elemSource = ctx.createMediaElementSource(audio);
          elemSource.connect(ctx.destination);
          elemSource.connect(mixedDestNodeRef.current);
        } catch (_) {}
      }

      const p = audio.play();
      if (p !== undefined) {
        p.catch(() => fallbackBrowserSpeech(cleanText, onDone));
      }
    } catch (_) {
      fallbackBrowserSpeech(cleanText, onDone);
    }
  };

  // Browser SpeechSynthesis Fallback
  const fallbackBrowserSpeech = (cleanText: string, onDone: () => void) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onDone();
      return;
    }
    try {
      window.speechSynthesis.resume();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.volume = 1.0;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = 'hi-IN';

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v =>
        v.lang.includes('IN') || v.lang.includes('hi') || v.name.includes('India') || v.name.includes('Natural')
      ) || voices[0];
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        window.speechSynthesis.resume();
      };
      utterance.onend = onDone;
      utterance.onerror = onDone;
      (window as any).__currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
      window.speechSynthesis.resume();
    } catch (_) {
      onDone();
    }
  };

  // Persistent Speech-To-Text (STT) setup - created once, never destroyed
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true; // Fast detection for short answers like 'yes'
    recognition.lang = 'en-IN';

    let speechSilenceTimer: any = null;
    let accumulatedText = '';

    // Only set user speaking true when actual speech sound starts
    recognition.onspeechstart = () => {
      if (!isAgentSpeakingRef.current && !isMicMutedRef.current) {
        setIsUserSpeaking(true);
      }
    };

    recognition.onspeechend = () => {
      // Speech paused
    };

    recognition.onresult = (event: any) => {
      if (isAgentSpeakingRef.current) return;

      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcriptPart;
        } else {
          interim += transcriptPart;
        }
      }

      setIsUserSpeaking(true);
      const currentCandidate = (final || interim).trim();

      if (currentCandidate) {
        accumulatedText = currentCandidate;
      }

      // If browser confirmed it as final, send immediately!
      if (final.trim()) {
        if (speechSilenceTimer) clearTimeout(speechSilenceTimer);
        const textToSend = final.trim();
        accumulatedText = '';
        setIsUserSpeaking(false);
        if (isCallActiveRef.current && !isProcessingTurnRef.current) {
          sendTurnRef.current(textToSend);
        }
        return;
      }

      // Fast response for short phrases ("yes", "haan"): send on 750ms pause
      if (accumulatedText.trim()) {
        if (speechSilenceTimer) clearTimeout(speechSilenceTimer);
        speechSilenceTimer = setTimeout(() => {
          const textToSend = accumulatedText.trim();
          accumulatedText = '';
          setIsUserSpeaking(false);
          if (textToSend && isCallActiveRef.current && !isProcessingTurnRef.current && !isAgentSpeakingRef.current) {
            sendTurnRef.current(textToSend);
          }
        }, 750);
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error !== 'no-speech') {
        console.warn('[SpeechRecognition] status:', e.error);
      }
      setIsUserSpeaking(false);
      if (e.error === 'network' || e.error === 'audio-capture') {
        setTimeout(() => {
          if (isCallActiveRef.current && !isMicMutedRef.current && !isAgentSpeakingRef.current) {
            startListening();
          }
        }, 300);
      }
    };

    recognition.onend = () => {
      setIsUserSpeaking(false);
      // Auto-restart loop if call is active and agent is not speaking
      if (isCallActiveRef.current && !isMicMutedRef.current && !isAgentSpeakingRef.current) {
        setTimeout(() => {
          if (isCallActiveRef.current && !isMicMutedRef.current && !isAgentSpeakingRef.current) {
            try {
              recognition.start();
            } catch (_) {}
          }
        }, 120);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (speechSilenceTimer) clearTimeout(speechSilenceTimer);
      try {
        recognition.stop();
      } catch (_) {}
    };
  }, []);

  // Start Call for a Specific Lead
  const handleStartCallForLead = async (targetLead: Lead) => {
    if (!targetLead) return;

    // Prime browser audio context within direct user gesture for Chrome Autoplay
    unlockBrowserAudio();

    setSelectedLeadId(String(targetLead.id));
    setDialPhoneNumber(targetLead.contact?.phone || '');
    currentLeadIdRef.current = targetLead.id;

    try {
      const res = await callsApi.startCall({
        lead_id: targetLead.id,
        phone: targetLead.contact?.phone || '',
        persona: selectedPersona,
        direction: 'OUTBOUND'
      });

      setActiveCallId(res.call_id);
      activeCallIdRef.current = res.call_id;
      setIsCallActive(true);
      isCallActiveRef.current = true;
      setCallDuration(0);
      setTranscripts([
        {
          speaker: 'AI_AGENT',
          message: res.initial_greeting,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          provider_used: 'groq',
          latency_ms: 120
        }
      ]);

      await startRecording();
      speakText(res.initial_greeting, res.audio_base64);
    } catch (err: any) {
      console.error('Failed to start call for lead:', err);
      if (isQueueRunningRef.current) {
        scheduleNextInQueue(targetLead.id);
      } else {
        alert(`Could not start call: ${err.message}`);
      }
    }
  };

  // Real PSTN Telecom Call Handler (Twilio Carrier)
  const handleStartRealPhoneCall = async () => {
    const targetNumber = dialPhoneNumber.trim();
    if (!targetNumber) {
      alert('Please enter a valid phone number to dial (e.g. +919898603098).');
      return;
    }

    if (!webhookUrl.trim() && !twilioConfig?.webhook_base_url) {
      alert('Please enter your public ngrok webhook URL (e.g. https://xyz.ngrok-free.app) and click Save before placing a live carrier call.');
      return;
    }

    const chosen = leads.find(l => String(l.id) === selectedLeadId);
    setIsPstnRinging(true);
    setTranscripts([
      {
        speaker: 'AI_AGENT',
        message: `Connecting live telecom carrier via Twilio to physical phone: ${targetNumber}...`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        provider_used: 'twilio',
        latency_ms: 0
      }
    ]);

    try {
      const res = await telephonyApi.dialRealPhone({
        to_number: targetNumber,
        persona: selectedPersona,
        lead_id: chosen ? chosen.id : undefined,
        contact_id: chosen?.contact_id,
        webhook_base_url: (webhookUrl || twilioConfig?.webhook_base_url || '').trim()
      });

      setActiveCallId(res.call_id);
      activeCallIdRef.current = res.call_id;

      // Connect to WebSocket monitor for live audio / transcript stream
      const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
      const wsUrl = `${wsProto}//${wsHost}/api/v1/telephony/live/monitor/${res.call_id}`;

      if (monitorWsRef.current) {
        try { monitorWsRef.current.close(); } catch (_) {}
      }

      const ws = new WebSocket(wsUrl);
      monitorWsRef.current = ws;

      ws.onopen = () => {
        console.log('[Twilio Monitor WS] Connected for call', res.call_id);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'transcript') {
            // Once speech is happening, the physical phone call is definitely active
            setIsPstnRinging(false);
            setIsCallActive(true);
            isCallActiveRef.current = true;
            if (!callStartTimeRef.current) {
              callStartTimeRef.current = Date.now();
              if (timerRef.current) clearInterval(timerRef.current);
              timerRef.current = setInterval(() => {
                setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
              }, 1000);
            }

            setTranscripts(prev => [
              ...prev,
              {
                speaker: data.speaker,
                message: data.message,
                timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                provider_used: data.provider_used || 'twilio_groq',
                latency_ms: data.latency_ms || 120,
                tool_calls: data.tool_calls
              }
            ]);
            if (data.speaker === 'AI_AGENT') {
              setIsAgentSpeaking(true);
              setIsUserSpeaking(false);
              setTimeout(() => setIsAgentSpeaking(false), 2500);
            } else if (data.speaker === 'CUSTOMER') {
              setIsUserSpeaking(true);
              setIsAgentSpeaking(false);
              setTimeout(() => setIsUserSpeaking(false), 1800);
            }
          } else if (data.type === 'status') {
            if (data.status === 'IN_PROGRESS' || data.status === 'ANSWERED') {
              setIsPstnRinging(false);
              setIsCallActive(true);
              isCallActiveRef.current = true;
              callStartTimeRef.current = Date.now();
              if (timerRef.current) clearInterval(timerRef.current);
              timerRef.current = setInterval(() => {
                setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
              }, 1000);
            } else if (['COMPLETED', 'FAILED', 'BUSY', 'NO_ANSWER', 'CANCELED', 'TERMINATED', 'DISCONNECTED'].includes(data.status)) {
              setIsPstnRinging(false);
              setIsCallActive(false);
              isCallActiveRef.current = false;
              if (timerRef.current) clearInterval(timerRef.current);
              queryClient.invalidateQueries({ queryKey: ['callHistory'] });
              queryClient.invalidateQueries({ queryKey: ['callingLeads'] });
              queryClient.invalidateQueries({ queryKey: ['recordingsLibrary'] });
            }
          }
        } catch (e) {
          console.warn('[Twilio Monitor WS] Parse error:', e);
        }
      };

      ws.onerror = (err) => {
        console.warn('[Twilio Monitor WS] Socket error:', err);
      };
    } catch (err: any) {
      setIsPstnRinging(false);
      alert(`Could not place phone call: ${err.message}`);
    }
  };

  // Start Call Handler (Single Dial Mode)
  const handleStartCall = async () => {
    if (callChannel === 'pstn') {
      await handleStartRealPhoneCall();
      return;
    }

    // Prime browser audio context within direct user gesture for Chrome Autoplay
    unlockBrowserAudio();

    const chosen = leads.find(l => String(l.id) === selectedLeadId);
    if (chosen) {
      handleStartCallForLead(chosen);
    } else if (dialPhoneNumber) {
      try {
        const res = await callsApi.startCall({
          phone: dialPhoneNumber,
          persona: selectedPersona,
          direction: 'OUTBOUND'
        });
        setActiveCallId(res.call_id);
        activeCallIdRef.current = res.call_id;
        setIsCallActive(true);
        isCallActiveRef.current = true;
        setCallDuration(0);
        setTranscripts([
          {
            speaker: 'AI_AGENT',
            message: res.initial_greeting,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            provider_used: 'groq',
            latency_ms: 120
          }
        ]);
        await startRecording();
        speakText(res.initial_greeting, res.audio_base64);
      } catch (err: any) {
        alert(`Could not start call: ${err.message}`);
      }
    } else {
      alert('Please select a lead or enter a phone number to dial.');
    }
  };

  // Auto-Dialer Queue Progression Engine
  const scheduleNextInQueue = (finishedLeadId?: number) => {
    let updatedCompleted = [...queueCompletedIdsRef.current];
    if (finishedLeadId && !updatedCompleted.includes(finishedLeadId)) {
      updatedCompleted.push(finishedLeadId);
      setQueueCompletedIds(updatedCompleted);
      queueCompletedIdsRef.current = updatedCompleted;
    }

    if (!isQueueRunningRef.current) return;

    // Find the next uncalled lead among selected leads
    const nextLead = leads.find(l => selectedQueueLeadIdsRef.current.includes(l.id) && !updatedCompleted.includes(l.id));

    if (!nextLead) {
      setIsQueueRunning(false);
      isQueueRunningRef.current = false;
      setNextCallCountdown(null);
      const totalSelected = selectedQueueLeadIdsRef.current.length;
      alert(`🎉 Auto-Dial Campaign Complete! All ${totalSelected} selected leads in the queue have been contacted.`);
      return;
    }

    // 5-second countdown between calls
    let remaining = 5;
    setNextCallCountdown(remaining);

    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    countdownIntervalRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(countdownIntervalRef.current);
        setNextCallCountdown(null);
        if (isQueueRunningRef.current) {
          handleStartCallForLead(nextLead);
        }
      } else {
        setNextCallCountdown(remaining);
      }
    }, 1000);
  };

  const handleStartQueue = () => {
    const selectedLeadsToDial = leads.filter(l => selectedQueueLeadIds.includes(l.id));
    if (selectedLeadsToDial.length === 0) {
      alert('Please select at least one lead from the queue list to start the campaign.');
      return;
    }
    setIsQueueRunning(true);
    isQueueRunningRef.current = true;
    setQueueCompletedIds([]);
    queueCompletedIdsRef.current = [];

    const firstLead = selectedLeadsToDial[0];
    handleStartCallForLead(firstLead);
  };

  const handleStopQueue = () => {
    setIsQueueRunning(false);
    isQueueRunningRef.current = false;
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setNextCallCountdown(null);
    if (isCallActiveRef.current) {
      handleEndCall('QUEUE_STOPPED');
    }
  };

  const handleSkipCountdown = () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setNextCallCountdown(null);
    const nextLead = leads.find(l => selectedQueueLeadIdsRef.current.includes(l.id) && !queueCompletedIdsRef.current.includes(l.id));
    if (nextLead && isQueueRunningRef.current) {
      handleStartCallForLead(nextLead);
    }
  };

  // Send Conversation Turn
  const sendTurn = async (messageText: string) => {
    unlockBrowserAudio();
    const currentCallId = activeCallIdRef.current;
    if (!messageText.trim() || !currentCallId || isProcessingTurnRef.current) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const userItem: TranscriptItem = {
      speaker: 'CUSTOMER',
      message: messageText,
      timestamp: timeStr
    };

    setTranscripts(prev => [...prev, userItem]);
    setUserInputText('');
    setIsProcessingTurn(true);
    isProcessingTurnRef.current = true;

    try {
      const historyPayload = transcriptsRef.current.map(t => ({
        role: t.speaker === 'AI_AGENT' ? 'assistant' : 'user',
        content: t.message
      }));

      const res = await callsApi.converse(currentCallId, {
        user_message: messageText,
        conversation_history: historyPayload,
        persona: selectedPersona,
        timestamp_offset_ms: callDuration * 1000
      });


      if (res.tool_actions && res.tool_actions.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['callingLeads'] });
        queryClient.invalidateQueries({ queryKey: ['leads'] });
      }

      const aiItem: TranscriptItem = {
        speaker: 'AI_AGENT',
        message: res.ai_response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        provider_used: res.provider_used,
        latency_ms: res.latency_ms,
        tool_actions: res.tool_actions
      };

      setTranscripts(prev => [...prev, aiItem]);
      speakText(res.ai_response || res.agent_response || '', res.audio_base64);

      if (res.is_call_ended) {
        setTimeout(() => handleEndCall('AI_TERMINATED_CALL'), 2500);
      }
    } catch (err: any) {
      console.error('Error during turn converse:', err);
    } finally {
      setIsProcessingTurn(false);
      isProcessingTurnRef.current = false;
    }
  };

  // Wire ref to latest sendTurn
  sendTurnRef.current = sendTurn;

  // End Call Handler
  const handleEndCall = async (reason = 'USER_DISCONNECTED') => {
    if (monitorWsRef.current) {
      try { monitorWsRef.current.close(); } catch (_) {}
      monitorWsRef.current = null;
    }
    setIsPstnRinging(false);

    const currentCallId = activeCallIdRef.current;
    const justFinishedLeadId = currentLeadIdRef.current || (selectedLeadId ? parseInt(selectedLeadId, 10) : undefined);
    if (!currentCallId) return;

    isCallActiveRef.current = false;
    isAgentSpeakingRef.current = false;
    stopListening();

    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
      } catch (_) {}
      activeAudioRef.current = null;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    // Stop and upload audio recording to backend
    stopAndUploadRecording(currentCallId);

    const finalDuration = callStartTimeRef.current > 0
      ? Math.max(1, Math.floor((Date.now() - callStartTimeRef.current) / 1000))
      : (callDuration || 1);

    try {
      const res = await callsApi.endCall(currentCallId, finalDuration, reason);
      setCallSummary(res);
      // In single call mode or when queue stops, show modal. In queue mode, show modal without blocking.
      setShowSummaryModal(true);
      queryClient.invalidateQueries({ queryKey: ['callingLeads'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (err) {
      console.error('Failed to end call session:', err);
    } finally {
      setIsCallActive(false);
      setActiveCallId(null);
      activeCallIdRef.current = null;
      setIsAgentSpeaking(false);
      setIsUserSpeaking(false);

      // Auto advance to next lead in queue
      if (isQueueRunningRef.current && justFinishedLeadId) {
        scheduleNextInQueue(justFinishedLeadId);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 'calc(100vh - 120px)' }}>

      {/* Main 2-Column Layout: Left Controls (520px) & Right Full-Width Active Call Stage (1fr) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '520px 1fr',
        gap: '24px',
        alignItems: 'stretch'
      }}>
        {/* COLUMN 1: Lead Selector & Phone Dialpad */}
        <DialerControl
          leads={leads}
          selectedLeadId={selectedLeadId}
          onLeadChange={handleLeadChange}
          selectedPersona={selectedPersona}
          onPersonaChange={setSelectedPersona}
          personaOptions={callingPersonas.map(p => ({ value: p.value, label: p.label }))}
          dialPhoneNumber={dialPhoneNumber}
          onPhoneChange={setDialPhoneNumber}
          isCallActive={isCallActive}
          onStartCall={handleStartCall}
          onEndCall={() => handleEndCall('USER_ENDED')}
          onSyncLeads={() => {
            queryClient.invalidateQueries({ queryKey: ['callingLeads'] });
          }}
          callChannel={callChannel}
          onCallChannelChange={setCallChannel}
          twilioConfig={twilioConfig}
          webhookUrl={webhookUrl}
          onWebhookUrlChange={setWebhookUrl}
          onSaveWebhookUrl={handleSaveWebhookUrl}
          isPstnRinging={isPstnRinging}
          isQueueMode={isQueueMode}
          onToggleQueueMode={setIsQueueMode}
          isQueueRunning={isQueueRunning}
          queueCompletedIds={queueCompletedIds}
          selectedQueueLeadIds={selectedQueueLeadIds}
          onToggleSelectLead={handleToggleSelectLead}
          onToggleSelectAll={handleToggleSelectAll}
          nextCallCountdown={nextCallCountdown}
          onStartQueue={handleStartQueue}
          onStopQueue={handleStopQueue}
          onSkipCountdown={handleSkipCountdown}
        />

        {/* COLUMN 2: Full-Width Active Conversational Stage & Waveform Pulse */}
        <ConversationalStage
          isCallActive={isCallActive}
          isAgentSpeaking={isAgentSpeaking}
          isUserSpeaking={isUserSpeaking}
          isMicMuted={isMicMuted}
          onToggleMic={() => setIsMicMuted(!isMicMuted)}
          transcripts={transcripts}
          userInputText={userInputText}
          onUserInputChange={setUserInputText}
          onSendTurn={sendTurn}
          isProcessingTurn={isProcessingTurn}
          messagesEndRef={messagesEndRef}
        />
      </div>

      {/* POST-CALL EXECUTIVE SUMMARY MODAL */}
      {showSummaryModal && callSummary && (
        <CallSummaryModal
          summary={callSummary}
          onClose={() => {
            setShowSummaryModal(false);
            setCallSummary(null);
          }}
        />
      )}
    </div>
  );
};

export default CallingAgentPage;

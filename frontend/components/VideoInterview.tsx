'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Mic, MicOff, CameraOff, Phone, Settings, MessageSquare, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface VideoInterviewProps {
  sessionToken: string;
  onEndInterview: (feedback: any) => void;
  interviewType: string;
  candidateName?: string;
}

interface InterviewMessage {
  type: 'ai_message' | 'user_message' | 'system' | 'typing_indicator';
  content: string;
  timestamp: string;
  isTyping?: boolean;
}

interface InterviewFeedback {
  overall_score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  total_responses: number;
  conversation_duration: number;
}

// Add type definitions for SpeechRecognition API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
}

export default function VideoInterview({ 
  sessionToken, 
  onEndInterview, 
  interviewType,
  candidateName = "Candidate"
}: VideoInterviewProps) {
  // Video/Audio states
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(true);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
    
  // Interview states
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  const [interviewStatus, setInterviewStatus] = useState<'connecting' | 'active' | 'completed'>('connecting');
  const [textInput, setTextInput] = useState('');
  
  // Speech recognition states
  const [isListening, setIsListening] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState<SpeechRecognition | null>(null);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const initGenRef = useRef(0);
  
  // Initialize media + websocket; make cleanup StrictMode-safe via generation token
  useEffect(() => {
    const myGen = ++initGenRef.current;
    initializeMedia();
    initializeWebSocket();
    initializeSpeechRecognition();

    return () => {
      // Defer cleanup so the next StrictMode mount can bump the generation first
      setTimeout(() => {
        if (initGenRef.current === myGen) {
          cleanup();
        }
      }, 0);
    };
  }, []);
  
  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      
      setVideoStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
    } catch (error) {
      console.error('Error accessing media devices:', error);
      alert('Could not access camera/microphone. Please check permissions.');
    }
  };
  
  const initializeWebSocket = () => {
    // Prevent duplicate sockets in Strict Mode or remounts
    if (
      websocketRef.current &&
      (websocketRef.current.readyState === WebSocket.OPEN ||
        websocketRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
    const url = new URL(base);
    const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsBase = `${wsProtocol}//${url.host}`;
    const wsUrl = `${wsBase}/api/interview/realtime/ws/${sessionToken}`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      
      // Send connection ready message
      ws.send(JSON.stringify({
        type: 'connection_ready'
      }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };
    
    ws.onclose = (event) => {
      console.log('WebSocket disconnected', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });
      setIsConnected(false);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
    
    websocketRef.current = ws;
  };
  
  const initializeSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        setCurrentTranscript(interimTranscript);
        
        if (finalTranscript) {
          handleUserSpeech(finalTranscript);
          setCurrentTranscript('');
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
      };
      
      setSpeechRecognition(recognition);
    }
  };
  
  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'ai_message':
        setMessages(prev => [...prev, {
          type: 'ai_message',
          content: data.content,
          timestamp: data.timestamp
        }]);
        setIsAITyping(false);
        
        // Speak the AI message
        if (isSpeakerEnabled) {
          speakText(data.content);
        }
        break;
        
      case 'typing_indicator':
        setIsAITyping(data.is_typing);
        break;
        
      case 'session_status':
        if (data.status === 'active') {
          setInterviewStatus('active');
        }
        break;
        
      case 'interview_completed':
        setInterviewStatus('completed');
        onEndInterview(data.feedback);
        break;
        
      case 'error':
        console.error('WebSocket error:', data.message);
        alert(`Error: ${data.message}`);
        break;
    }
  };
  
  const handleUserSpeech = (transcript: string) => {
    if (transcript.trim().length < 5) return;
    
    setMessages(prev => [...prev, {
      type: 'user_message',
      content: transcript,
      timestamp: new Date().toISOString()
    }]);
    
    // Send to AI
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({
        type: 'user_text',
        text: transcript
      }));
    }
  };
  
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      speechSynthesis.speak(utterance);
    }
  };
  
  const toggleVideo = () => {
    if (videoStream) {
      const videoTrack = videoStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };
  
  const toggleAudio = () => {
    if (videoStream) {
      const audioTrack = videoStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        
        // Also control speech recognition
        if (audioTrack.enabled) {
          startListening();
        } else {
          stopListening();
        }
      }
    }
  };
  
  const toggleSpeaker = () => {
    setIsSpeakerEnabled(!isSpeakerEnabled);
    if (isSpeakerEnabled) {
      speechSynthesis.cancel(); // Stop current speech
    }
  };
  
  const startListening = () => {
    if (speechRecognition && isAudioEnabled) {
      speechRecognition.start();
      setIsListening(true);
    }
  };
  
  const stopListening = () => {
    if (speechRecognition) {
      speechRecognition.stop();
      setIsListening(false);
    }
  };

  const sendTextMessage = () => {
    const text = textInput.trim();
    if (!text || !websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) return;
    // Push user's text message into chat
    setMessages(prev => [...prev, {
      type: 'user_message',
      content: text,
      timestamp: new Date().toISOString()
    }]);
    // Send to backend over WS
    websocketRef.current.send(JSON.stringify({ type: 'user_text', text }));
    setTextInput('');
  };
  
  const endInterview = () => {
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({
        type: 'end_interview'
      }));
    }
  };
  
  const cleanup = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
    }
    if (websocketRef.current) {
      const ws = websocketRef.current;
      // Avoid closing a CONNECTING socket (Strict Mode double invoke). Let it settle.
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      websocketRef.current = null;
    }
    if (speechRecognition) {
      speechRecognition.stop();
    }
    speechSynthesis.cancel();
  };
  
  // Auto-start listening when audio is enabled
  useEffect(() => {
    if (isAudioEnabled && isConnected && interviewStatus === 'active') {
      startListening();
    } else {
      stopListening();
    }
  }, [isAudioEnabled, isConnected, interviewStatus]);

  // Auto-scroll chat to bottom on new messages or typing indicator changes
  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, currentTranscript, isAITyping]);
  
  return (
    <div className="min-h-screen border border-gray-300 bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-300 p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-white">AI</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold ">AI Interview Session</h1>
              <p className="text-sm text-gray-400">
                {interviewType.charAt(0).toUpperCase() + interviewType.slice(1)} Interview
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
            <Badge variant="outline">
              {interviewStatus === 'connecting' ? 'Connecting...' : 
               interviewStatus === 'active' ? 'Active' : 'Completed'}
            </Badge>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-120px)]">
          
          {/* Video Panel */}
          <div className="lg:col-span-2 space-y-4">
            {/* AI Avatar / Video */}
            <Card className="bg-white border-gray-200 p-6 h-52">
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-white">AI</span>
                  </div>
                  <h3 className="text-lg font-semibold">AI Interviewer</h3>
                  <p className="text-gray-400">Ready to begin your interview</p>
                  {isAITyping && (
                    <div className="mt-2 flex justify-center">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
            
            {/* User Video */}
            <Card className="bg-white border-gray-200 p-1 h-98">
              <div className="relative h-full">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover rounded-lg ${
                    !isVideoEnabled ? 'hidden' : ''
                  }`}
                />
                {!isVideoEnabled && (
                  <div className="w-full h-[458px] bg-white rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <CameraOff className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p className="text-gray-400">Camera off</p>
                    </div>
                  </div>
                )}
                
                {/* User name overlay */}
                <div className="absolute bottom-2 left-2 bg-white bg-opacity-50 px-2 py-1 rounded">
                  <span className="text-sm">{candidateName}</span>
                </div>
                
                {/* Audio indicator */}
                {isListening && (
                  <div className="absolute top-2 right-2 bg-red-500 px-2 py-1 rounded-full">
                    <span className="text-xs">🎤 Listening</span>
                  </div>
                )}
              </div>
            </Card>
            
            {/* Controls */}
            <div className="flex justify-center space-x-4">
              <Button
                variant={isVideoEnabled ? "default" : "destructive"}
                size="lg"
                onClick={toggleVideo}
                className="rounded-full w-12 h-12 p-0 bg-white text-black border border-gray-400 hover:bg-gray-200"
              >
                {isVideoEnabled ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
              </Button>
              
              <Button
                variant={isAudioEnabled ? "default" : "destructive"}
                size="lg"
                onClick={toggleAudio}
                className="rounded-full w-12 h-12 p-0 bg-white text-black border border-gray-400 hover:bg-gray-200"
              >
                {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </Button>
              
              <Button
                variant={isSpeakerEnabled ? "default" : "secondary"}
                size="lg"
                onClick={toggleSpeaker}
                className="rounded-full w-12 h-12 p-0 bg-white text-black border border-gray-400 hover:bg-gray-200"
              >
                {isSpeakerEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </Button>
              
              <Button
                variant="destructive"
                size="lg"
                onClick={endInterview}
                className="rounded-full w-12 h-12 p-0"
              >
                <Phone className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          {/* Chat Panel */}
            <div className="flex flex-col h-[calc(100vh-180px)]">
            <Card className="bg-white border-gray-200 p-4 flex flex-col h-full">
              <div className="flex items-center space-x-2 mb-4 flex-shrink-0">
                <MessageSquare className="w-5 h-5" />
                <h3 className="font-semibold">Conversation</h3>
              </div>

              <div ref={chatScrollRef} className="space-y-3 flex-1 overflow-y-auto pr-2">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg max-w-[85%] ${
                      message.type === 'ai_message'
                        ? 'bg-white mr-auto border border-gray-400'
                        : message.type === 'user_message'
                        ? 'bg-white ml-auto border border-gray-400'
                        : 'bg-white mx-auto border border-gray-400'
                    }`}
                  >
                    <div className="text-sm opacity-80">
                      <strong>
                        {message.type === 'ai_message' ? 'AI Interviewer' :
                         message.type === 'user_message' ? 'You' : 'System'}:
                      </strong>
                    </div>
                    <div className="mt-1">{message.content}</div>
                    <div className="text-xs opacity-70 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
                
                {/* Current transcript */}
                {currentTranscript && (
                  <div className="bg-white p-3 rounded-lg opacity-70 max-w-[85%] ml-auto">
                    <div className="text-sm opacity-80"><strong>You (speaking...)</strong></div>
                    <div className="mt-1">{currentTranscript}</div>
                  </div>
                )}
                
                {/* AI typing indicator */}
                {isAITyping && (
                  <div className="bg-gray-500 p-3 rounded-lg max-w-[85%] mr-auto">
                    <div className="text-sm opacity-80"><strong>AI Interviewer</strong></div>
                    <div className="mt-1 flex items-center space-x-1">
                      <span>Thinking</span>
                      <div className="flex space-x-1">
                        <div className="w-1 h-1 rounded-full animate-bounce"></div>
                        <div className="w-1 h-1 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-1 h-1 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Text input */}
              <form
                className="mt-3 flex items-center gap-2 flex-shrink-0"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendTextMessage();
                }}
              >
                <input
                  type="text"
                  className="w-full rounded-md bg-white border border-gray-400 px-3 py-2 text-sm placeholder-gray-400 focus:outline-none "
                  placeholder={isConnected ? 'Type a message…' : 'Connecting…'}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  disabled={!isConnected}
                />
                <Button className='bg-gray-500 text-white border-gray-700' type="submit" disabled={!isConnected || textInput.trim().length === 0}>
                  Send
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

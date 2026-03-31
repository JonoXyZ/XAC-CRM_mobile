import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Sparkle, Copy, ArrowsClockwise } from '@phosphor-icons/react';
import { toast } from 'sonner';

const AIWritingAssistant = ({ open, onOpenChange, onSelectMessage }) => {
  const [messageType, setMessageType] = useState('welcome');
  const [tone, setTone] = useState('professional');
  const [generating, setGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState('');

  const handleGenerate = () => {
    setGenerating(true);
    
    setTimeout(() => {
      const messages = {
        welcome: {
          professional: "Hi {client_name}, thank you for your interest in Revival Fitness! I'm {consultant_name}, and I'm excited to help you achieve your fitness goals. When would be a good time for you to visit our facility for a tour?",
          friendly: "Hey {client_name}! 👋 Thanks for reaching out to Revival Fitness! I'm {consultant_name} and I'd love to show you around our awesome gym. When are you free to pop by?",
          formal: "Dear {client_name},\n\nThank you for expressing interest in Revival Fitness. I am {consultant_name}, and it would be my pleasure to arrange a facility tour at your convenience. Please let me know your preferred date and time."
        },
        followup: {
          professional: "Hi {client_name}, I wanted to follow up on your inquiry about Revival Fitness. Have you had a chance to consider scheduling a visit? I'm here to answer any questions you might have.",
          friendly: "Hey {client_name}! Just checking in to see if you'd like to schedule that gym tour we talked about? I'm here if you have any questions! 💪",
          formal: "Dear {client_name},\n\nI am following up regarding your inquiry. Should you require any additional information or wish to schedule an appointment, please do not hesitate to contact me."
        },
        appointment_reminder: {
          professional: "Hi {client_name}, this is a friendly reminder about your appointment at Revival Fitness on {appointment_date} at {appointment_time}. We're looking forward to seeing you! If you need to reschedule, please let me know.",
          friendly: "Hey {client_name}! Quick reminder - see you tomorrow at {appointment_time} for your gym tour! Can't wait to show you around! 🎉",
          formal: "Dear {client_name},\n\nThis is to confirm your scheduled appointment at Revival Fitness on {appointment_date} at {appointment_time}. Should you need to make any changes, please inform us at your earliest convenience."
        },
        thank_you: {
          professional: "Thank you for visiting Revival Fitness today, {client_name}! It was great meeting you. I've sent over the membership details we discussed. Feel free to reach out if you have any questions!",
          friendly: "Thanks for stopping by today, {client_name}! It was awesome meeting you! 😊 I've sent the info we chatted about. Hit me up anytime!",
          formal: "Dear {client_name},\n\nThank you for your visit to Revival Fitness. The membership information discussed has been forwarded to you. Please contact me should you require any clarification."
        }
      };

      const message = messages[messageType]?.[tone] || "Message generated successfully!";
      setGeneratedMessage(message);
      setGenerating(false);
    }, 1200);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedMessage);
    toast.success('Message copied to clipboard!');
  };

  const handleUseMessage = () => {
    if (onSelectMessage) {
      onSelectMessage(generatedMessage);
      toast.success('Message added to template!');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50 max-w-2xl" data-testid="ai-writing-assistant">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-zinc-50">
            <Sparkle size={24} weight="fill" className="text-cyan-400" />
            AI Writing Assistant
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="p-4 bg-gradient-to-r from-lime-400/10 to-cyan-500/10 border border-lime-400/20 rounded-lg">
            <p className="text-sm text-zinc-300">
              Generate professional messages with AI. Select message type and tone, then customize with variables like {'{client_name}'}, {'{consultant_name}'}, and more!
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Message Type</Label>
              <Select value={messageType} onValueChange={setMessageType} data-testid="message-type-select">
                <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="welcome">Welcome Message</SelectItem>
                  <SelectItem value="followup">Follow-up</SelectItem>
                  <SelectItem value="appointment_reminder">Appointment Reminder</SelectItem>
                  <SelectItem value="thank_you">Thank You</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Tone</Label>
              <Select value={tone} onValueChange={setTone} data-testid="tone-select">
                <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating}
            data-testid="generate-button"
            className="w-full bg-gradient-to-r from-lime-400 to-cyan-500 text-zinc-950 font-bold hover:opacity-90 flex items-center justify-center gap-2"
          >
            <Sparkle size={20} weight="fill" />
            {generating ? 'Generating...' : 'Generate Message'}
          </Button>

          {generatedMessage && (
            <div className="space-y-3">
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg">
                <p className="text-sm text-zinc-100 whitespace-pre-wrap">{generatedMessage}</p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleGenerate}
                  data-testid="regenerate-button"
                  className="flex-1 bg-zinc-800 text-zinc-50 hover:bg-zinc-700 flex items-center justify-center gap-2"
                >
                  <ArrowsClockwise size={18} />
                  Regenerate
                </Button>
                <Button
                  onClick={handleCopy}
                  data-testid="copy-button"
                  className="flex-1 bg-zinc-800 text-zinc-50 hover:bg-zinc-700 flex items-center justify-center gap-2"
                >
                  <Copy size={18} />
                  Copy
                </Button>
                <Button
                  onClick={handleUseMessage}
                  data-testid="use-message-button"
                  className="flex-1 bg-lime-400 text-zinc-950 font-bold hover:bg-lime-500"
                >
                  Use Message
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AIWritingAssistant;

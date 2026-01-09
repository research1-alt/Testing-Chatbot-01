export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  suggestions?: string[];
  unclear?: boolean;
  imageUrl?: string;
  videoUrl?: string;
}
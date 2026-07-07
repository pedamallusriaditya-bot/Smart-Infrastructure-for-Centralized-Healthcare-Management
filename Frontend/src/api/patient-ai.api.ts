import axiosInstance from './axiosInstance';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export const sendPatientChatMessage = async (
  message: string,
  language: string,
  history: ChatMessage[]
) => {
  const response = await axiosInstance.post('/patients/ai/chat', {
    message,
    language,
    history
  });
  return response.data.data;
};

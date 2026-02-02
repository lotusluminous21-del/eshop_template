'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

import { IS_AI_ENABLED } from '@/lib/config';

export function ChatAssistant() {
    if (!IS_AI_ENABLED) return null;

    const [isOpen, setIsOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [input, setInput] = useState('');
    const { messages, sendMessage, status, stop } = useChat({
        transport: new DefaultChatTransport({
            api: '/api/chat',
            // Generate a proper session ID in production
            body: { sessionId: 'demo-session-id' },
        }),
    });

    const isLoading = status === 'streaming' || status === 'submitted';

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const currentInput = input;
        setInput('');
        await sendMessage({ text: currentInput });
    };

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    return (
        <div className="fixed bottom-4 right-4 z-50">
            {!isOpen && (
                <Button
                    onClick={() => setIsOpen(true)}
                    className="h-14 w-14 rounded-full shadow-lg"
                >
                    <MessageCircle className="h-6 w-6" />
                </Button>
            )}

            {isOpen && (
                <Card className="w-[380px] h-[600px] flex flex-col shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
                        <div className="flex items-center gap-2">
                            <Bot className="h-5 w-5 text-primary" />
                            <CardTitle className="text-base">Shop Assistant</CardTitle>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>

                    <CardContent className="flex-1 p-0 overflow-hidden">
                        <ScrollArea className="h-full p-4">
                            <div className="space-y-4">
                                {messages.length === 0 && (
                                    <div className="text-center text-muted-foreground text-sm py-8">
                                        👋 Hi! I can help you find products, answer questions, or check order status.
                                    </div>
                                )}

                                {messages.map((m) => (
                                    <div
                                        key={m.id}
                                        className={cn(
                                            "flex gap-3 text-sm max-w-[85%]",
                                            m.role === 'user' ? "ml-auto" : "mr-auto"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "p-3 rounded-lg",
                                                m.role === 'user'
                                                    ? "bg-primary text-primary-foreground rounded-br-none"
                                                    : "bg-muted rounded-bl-none"
                                            )}
                                        >
                                            <ReactMarkdown
                                                components={{
                                                    p: ({ children, ...props }) => <p className="mb-0 last:mb-0" {...props}>{children}</p>
                                                }}
                                            >
                                                {m.parts.map((part, i) => (
                                                    part.type === 'text' ? part.text :
                                                        part.type === 'reasoning' ? `*Reasoning: ${part.text}*` : null
                                                )).join('\n') || (m as unknown as { content: string }).content}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                ))}

                                {isLoading && (
                                    <div className="flex gap-2 items-center text-muted-foreground ml-2">
                                        <div className="h-2 w-2 bg-current rounded-full animate-bounce" />
                                        <div className="h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
                                        <div className="h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>
                    </CardContent>

                    <CardFooter className="p-4 pt-2 border-t">
                        <form onSubmit={handleSubmit} className="flex w-full gap-2">
                            <Input
                                value={input}
                                onChange={handleInputChange}
                                placeholder="Ask about products..."
                                className="flex-1"
                            />
                            <Button type="submit" size="icon" disabled={isLoading}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}

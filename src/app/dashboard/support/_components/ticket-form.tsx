"use client";

import { useState } from "react";
import { useRequireServerAuth } from "@/hooks/use-server-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface TicketFormProps {
  onTicketCreated: () => void;
}

export function TicketForm({ onTicketCreated }: TicketFormProps) {
  const serverAuth = useRequireServerAuth();
  const [category, setCategory] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!category || !subject.trim() || !description.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, subject: subject.trim(), description: description.trim() }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to submit ticket");
      }

      toast.success("Ticket submitted successfully");
      setSubmitted(true);
      setCategory("");
      setSubject("");
      setDescription("");
      onTicketCreated();

      // Reset the success state after a few seconds
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
        <h3 className="text-lg font-medium">Ticket Submitted</h3>
        <p className="text-sm text-muted-foreground mt-1">
          We&apos;ll get back to you at {serverAuth.userEmail} as soon as possible.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Have a question, found a bug, or want to request a feature? Let us know and we&apos;ll
        get back to you at {serverAuth.userEmail}.
      </p>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger id="category" className="w-full sm:w-64">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bug">Bug Report</SelectItem>
            <SelectItem value="feature">Feature Request</SelectItem>
            <SelectItem value="general">General Question</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          placeholder="Brief summary of your issue or request"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={200}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe your issue, question, or feature request in detail..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          maxLength={5000}
        />
        <p className="text-xs text-muted-foreground text-right">
          {description.length}/5000
        </p>
      </div>

      <Button type="submit" disabled={isSubmitting || !category || !subject.trim() || !description.trim()}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit Ticket"
        )}
      </Button>
    </form>
  );
}

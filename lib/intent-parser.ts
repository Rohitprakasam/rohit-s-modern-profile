export type ParsedIntent = {
  type: "expense" | "task" | "exam_study" | "health_checkin" | "note" | "reminder";
  title: string;
  amount?: number;
  category?: string;
  status?: "done" | "open";
  metadata?: any;
};

export function parseIntent(message: string): ParsedIntent {
  const text = message.trim();

  // 0. Reminders with time logic
  if (/\bremind\b/i.test(text)) {
    let remindTitle = "Meeting";
    let hour = 12;
    let minute = 0;
    let isPm = true;

    const match1 = text.match(/remind\s+me\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(o'clock|clk|am|pm)?\s+(.*)/i);
    const match2 = text.match(/remind\s+me\s+(?:to\s+)?(.*)\s+(?:at\s+)(\d{1,2})(?::(\d{2}))?\s*(am|pm|clk|o'clock)?/i);

    if (match1) {
      hour = parseInt(match1[1]);
      minute = match1[2] ? parseInt(match1[2]) : 0;
      const marker = (match1[3] || "").toLowerCase();
      if (marker === "am") isPm = false;
      if (marker === "pm") isPm = true;
      remindTitle = match1[4] || "Meeting";
    } else if (match2) {
      remindTitle = match2[1] || "Meeting";
      hour = parseInt(match2[2]);
      minute = match2[3] ? parseInt(match2[3]) : 0;
      const marker = (match2[4] || "").toLowerCase();
      if (marker === "am") isPm = false;
      if (marker === "pm") isPm = true;
    } else {
      const fallbackMatch = text.match(/remind\s+me\s+(?:to\s+)?(.*)/i);
      remindTitle = fallbackMatch ? fallbackMatch[1] : text;
    }

    if (isPm && hour < 12) hour += 12;
    if (!isPm && hour === 12) hour = 0;

    const targetDate = new Date();
    targetDate.setHours(hour, minute, 0, 0);

    if (targetDate.getTime() <= Date.now()) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    const remindAtDate = new Date(targetDate.getTime() - 10 * 60 * 1000);

    return {
      type: "reminder",
      title: remindTitle.trim(),
      status: "open",
      metadata: {
        targetTime: targetDate.toISOString(),
        remindAt: remindAtDate.toISOString(),
        originalText: text
      }
    };
  }

  // 1. Expense logging
  const expense = text.match(/^(?:spent|spend|paid)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:on|for)?\s*(.*)$/i);
  if (expense) {
    return {
      type: "expense",
      amount: Number(expense[1]),
      title: expense[2] || "Expense",
      category: expense[2] || "General",
    };
  }

  // 2. Water intake logging
  const waterMatch = text.match(/^(?:drank|drink|water)\s*(\d+(?:\.\d+)?)\s*(ml|milliliters|glasses?|cups?)?/i);
  if (waterMatch) {
    const qty = Number(waterMatch[1]);
    const unit = (waterMatch[2] || "ml").toLowerCase();
    const finalAmount = unit.startsWith("glass") || unit.startsWith("cup") ? qty * 250 : qty;
    return {
      type: "health_checkin",
      title: `Drank ${finalAmount}ml of water`,
      amount: finalAmount,
      category: "Water",
      status: "done",
    };
  }

  // 3. Study session logging
  const study = text.match(/^(?:studied|study)\s*(\d+(?:\.\d+)?)?\s*(?:hours?|hrs?)?\s*(.*)$/i);
  if (study) {
    return {
      type: "exam_study",
      title: `${study[2] || "Study"}${study[1] ? ` · ${study[1]} hours` : ""}`,
      amount: study[1] ? Number(study[1]) : 1.0,
      category: study[2] || "General",
      status: "done",
    };
  }

  // 4. Other wellness checks
  if (/\b(?:medicine|sleep|woke|workout|walk)\b/i.test(text)) {
    return {
      type: "health_checkin",
      title: text,
      category: "General",
      status: "done",
    };
  }

  // 5. Tasks/Reminders
  const task = text.match(/^(?:task:|remind me to|done:?)\s*(.*)$/i);
  if (task?.[1]) {
    return {
      type: "task",
      title: task[1],
      status: /^done/i.test(text) ? "done" : "open",
    };
  }

  return { type: "note", title: text };
}

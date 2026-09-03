import clientPromise from './mongodb';
import { generateWithTools } from './gemini';
import { searchMemory } from './embeddings';
import { getRecentConversation, embedAndStoreTrackerEntry } from './memory';

const DB_NAME = process.env.MONGODB_DB_NAME || "rohit_portfolio";

const TOOL_DECLARATIONS = [
  {
    functionDeclarations: [
      {
        name: "add_task",
        description: "Creates a new task that the user wants to accomplish. E.g. 'remind me to study Polity' or 'add task buy eggs'",
        parameters: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING", description: "The content or title of the task" }
          },
          required: ["title"]
        }
      },
      {
        name: "complete_task",
        description: "Marks an existing open task as done.",
        parameters: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING", description: "The exact or partial title of the task to complete" }
          },
          required: ["title"]
        }
      },
      {
        name: "list_tasks",
        description: "Returns a list of all currently open/pending tasks for today.",
        parameters: { type: "OBJECT", properties: {} }
      },
      {
        name: "add_expense",
        description: "Logs a money expense. E.g. 'spent 150 on food' or 'spend rs 300'",
        parameters: {
          type: "OBJECT",
          properties: {
            amount: { type: "NUMBER", description: "Amount of money spent in Rupees (INR)" },
            title: { type: "STRING", description: "What the expense was for, e.g. 'lunch', 'transport'" }
          },
          required: ["amount", "title"]
        }
      },
      {
        name: "add_income",
        description: "Logs a money income. E.g. 'got pocket money of 500' or 'added 20000 salary'",
        parameters: {
          type: "OBJECT",
          properties: {
            amount: { type: "NUMBER", description: "Amount of money earned in Rupees (INR)" },
            title: { type: "STRING", description: "The source of the income, e.g. 'pocket money', 'freelance'" }
          },
          required: ["amount", "title"]
        }
      },
      {
        name: "deposit_savings",
        description: "Adds/deposits money toward a savings goal. E.g. 'save 500 for iphone' or 'put 100 in saving goal'",
        parameters: {
          type: "OBJECT",
          properties: {
            goalName: { type: "STRING", description: "Name of the target savings goal, e.g. 'iphone'" },
            amount: { type: "NUMBER", description: "Amount of money to deposit in Rupees" }
          },
          required: ["goalName", "amount"]
        }
      },
      {
        name: "check_balance",
        description: "Returns summary of monthly budget including income, total expenses, and remaining safe to spend amount.",
        parameters: { type: "OBJECT", properties: {} }
      },
      {
        name: "log_water",
        description: "Logs hydration/water intake. E.g. 'drank 500ml water' or 'logged 2 glasses of water'",
        parameters: {
          type: "OBJECT",
          properties: {
            ml: { type: "NUMBER", description: "Amount of water in milliliters (ml). If user says glass/cup, assume 250ml per glass" }
          },
          required: ["ml"]
        }
      },
      {
        name: "log_study",
        description: "Logs study hours for exams. E.g. 'studied polity for 2 hours' or 'did 3 hours of geography'",
        parameters: {
          type: "OBJECT",
          properties: {
            subject: { type: "STRING", description: "The name of the subject or topic studied, e.g. 'Polity', 'History'" },
            hours: { type: "NUMBER", description: "Hours spent studying" }
          },
          required: ["subject", "hours"]
        }
      },
      {
        name: "log_meal",
        description: "Logs details of a meal. E.g. 'had dosa for breakfast' or 'ate briyani for dinner'",
        parameters: {
          type: "OBJECT",
          properties: {
            meal: { type: "STRING", description: "Description of what they ate, e.g. 'dosa for breakfast', 'biryani'" }
          },
          required: ["meal"]
        }
      },
      {
        name: "log_chore",
        description: "Logs chore completion. E.g. 'did laundry' or 'cleaned room'",
        parameters: {
          type: "OBJECT",
          properties: {
            chore: { type: "STRING", description: "Description of the chore done" }
          },
          required: ["chore"]
        }
      },
      {
        name: "search_history",
        description: "Performs RAG search across stored history (past expenses, meals, tasks, logs) to answer user questions about their past.",
        parameters: {
          type: "OBJECT",
          properties: {
            query: { type: "STRING", description: "Semantic search query, e.g. 'food expenses', 'what tasks did I complete'" }
          },
          required: ["query"]
        }
      }
    ]
  }
];

interface ToolExecutionResult {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Execute tool function calls by mapping names to MongoDB interactions.
 */
async function executeTool(name: string, args: any, source: string): Promise<ToolExecutionResult> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const trackerCol = db.collection("tracker_entries");
  const savingsCol = db.collection("savings_goals");

  try {
    switch (name) {
      case "add_task": {
        const result = await trackerCol.insertOne({
          type: "task", title: args.title, status: "open", source, createdAt: new Date()
        });
        await embedAndStoreTrackerEntry(result.insertedId.toString(), "task", args.title);
        return { success: true, message: `Successfully created task: "${args.title}"` };
      }

      case "complete_task": {
        const openTasks = await trackerCol.find({ type: "task", status: "open" }).toArray();
        const target = openTasks.find((t: any) => t.title.toLowerCase().includes(args.title.toLowerCase()));
        if (target) {
          await trackerCol.updateOne({ _id: target._id }, { $set: { status: "done" } });
          return { success: true, message: `Successfully completed task: "${target.title}"` };
        }
        return { success: false, message: `No open task matching "${args.title}" found.` };
      }

      case "list_tasks": {
        const openTasks = await trackerCol.find({ type: "task", status: "open" }).sort({ createdAt: -1 }).toArray();
        if (openTasks.length === 0) {
          return { success: true, message: "No open tasks currently." };
        }
        const taskList = openTasks.map((t: any, idx: number) => `${idx + 1}. ${t.title}`).join("\n");
        return { success: true, message: `Here are the open tasks:\n${taskList}`, data: openTasks };
      }

      case "add_expense": {
        const result = await trackerCol.insertOne({
          type: "expense", title: args.title, amount: args.amount,
          category: args.title, status: "done", source, createdAt: new Date()
        });
        await embedAndStoreTrackerEntry(result.insertedId.toString(), "expense", args.title, args.amount, args.title);
        return { success: true, message: `Logged expense: ₹${args.amount} for "${args.title}"` };
      }

      case "add_income": {
        const result = await trackerCol.insertOne({
          type: "income", title: args.title, amount: args.amount,
          category: "General", status: "done", source, createdAt: new Date()
        });
        await embedAndStoreTrackerEntry(result.insertedId.toString(), "income", args.title, args.amount, "General");
        return { success: true, message: `Logged income: ₹${args.amount} from "${args.title}"` };
      }

      case "deposit_savings": {
        const goals = await savingsCol.find({ status: "active" }).toArray();
        let targetGoal = goals.find((g: any) => g.name.toLowerCase().includes(args.goalName.toLowerCase()));
        
        if (!targetGoal) {
          const insertResult = await savingsCol.insertOne({
            name: args.goalName, targetAmount: args.amount * 10, savedAmount: 0, status: "active",
            createdAt: new Date(), updatedAt: new Date()
          });
          targetGoal = { _id: insertResult.insertedId, name: args.goalName, targetAmount: args.amount * 10, savedAmount: 0 };
        }

        const newSaved = targetGoal.savedAmount + args.amount;
        const newStatus = newSaved >= targetGoal.targetAmount ? "completed" : "active";
        await savingsCol.updateOne(
          { _id: targetGoal._id },
          { $set: { savedAmount: newSaved, status: newStatus, updatedAt: new Date() } }
        );

        const trackerResult = await trackerCol.insertOne({
          type: "expense", title: `Savings: ${targetGoal.name}`, amount: args.amount,
          category: "Savings", status: "done", source, createdAt: new Date()
        });
        await embedAndStoreTrackerEntry(trackerResult.insertedId.toString(), "expense", `Saved money to ${targetGoal.name}`, args.amount, "Savings");

        return {
          success: true,
          message: `Saved ₹${args.amount} to "${targetGoal.name}". Current total saved: ₹${newSaved} / ₹${targetGoal.targetAmount}.`
        };
      }

      case "check_balance": {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const moneyEntries = await trackerCol.find({
          type: { $in: ["expense", "income"] }, createdAt: { $gte: startOfMonth }
        }).toArray();

        const income = moneyEntries.filter((e: any) => e.type === "income").reduce((s: number, e: any) => s + (e.amount || 0), 0);
        const spent = moneyEntries.filter((e: any) => e.type === "expense").reduce((s: number, e: any) => s + (e.amount || 0), 0);
        const goals = await savingsCol.find({ status: "active" }).toArray();
        const totalSaved = goals.reduce((s: number, g: any) => s + (g.savedAmount || 0), 0);

        const daysInMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0).getDate();
        const daysRemaining = daysInMonth - new Date().getDate() + 1;
        const safeToSpend = Math.max(0, (income - spent - totalSaved) / daysRemaining);

        return {
          success: true,
          message: `This Month Summary:\n- Income: ₹${income}\n- Total Spent: ₹${spent}\n- Savings: ₹${totalSaved}\n- Daily Safe-to-Spend: ₹${safeToSpend.toFixed(0)}/day (${daysRemaining} days remaining)`
        };
      }

      case "log_water": {
        const result = await trackerCol.insertOne({
          type: "health_checkin", title: `Drank ${args.ml}ml of water`, amount: args.ml,
          category: "Water", status: "done", source, createdAt: new Date()
        });
        await embedAndStoreTrackerEntry(result.insertedId.toString(), "health_checkin", `Drank ${args.ml}ml of water`, args.ml, "Water");

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const waterEntries = await trackerCol.find({
          type: "health_checkin", category: "Water", createdAt: { $gte: startOfToday }
        }).toArray();
        const totalMl = waterEntries.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

        return { success: true, message: `Logged ${args.ml}ml of water. Total today: ${totalMl}ml / 3000ml.` };
      }

      case "log_study": {
        const result = await trackerCol.insertOne({
          type: "exam_study", title: `${args.subject} · ${args.hours} hours`, amount: args.hours,
          category: args.subject, status: "done", source, createdAt: new Date()
        });
        await embedAndStoreTrackerEntry(result.insertedId.toString(), "exam_study", `Studied ${args.subject}`, args.hours, args.subject);
        return { success: true, message: `Logged study session: ${args.hours} hours on "${args.subject}"` };
      }

      case "log_meal": {
        const result = await trackerCol.insertOne({
          type: "meal", title: args.meal, status: "done", source, createdAt: new Date()
        });
        await embedAndStoreTrackerEntry(result.insertedId.toString(), "meal", args.meal);
        return { success: true, message: `Logged meal: "${args.meal}"` };
      }

      case "log_chore": {
        const result = await trackerCol.insertOne({
          type: "chore", title: args.chore, status: "done", source, createdAt: new Date()
        });
        await embedAndStoreTrackerEntry(result.insertedId.toString(), "chore", args.chore);
        return { success: true, message: `Logged chore: "${args.chore}"` };
      }

      case "search_history": {
        const results = await searchMemory(args.query, 4);
        if (results.length === 0) {
          return { success: true, message: `No matches found for query: "${args.query}"` };
        }
        const matches = results.map(r => `- ${r.content} (${r.sourceType}, Similarity: ${(r.similarity * 100).toFixed(0)}%)`).join("\n");
        return { success: true, message: `Found the following relevant logs matching "${args.query}":\n${matches}`, data: results };
      }

      default:
        return { success: false, message: `Tool "${name}" is not implemented.` };
    }
  } catch (error: any) {
    console.error(`Error executing tool ${name}:`, error);
    return { success: false, message: `Tool execution failed: ${error.message}` };
  }
}

/**
 * Runs the tool-calling Agent loop with RAG search retrieval.
 */
export async function runAgent(messageText: string, source = "whatsapp", persona = "girlfriend"): Promise<string> {
  const history = await getRecentConversation(source, 6);
  
  // RAG Search for context
  let ragContext = "";
  try {
    const searchTerms = messageText.replace(/[.,?/#!$%/^&*;:{}=\-_`~()]/g, "").trim();
    if (searchTerms.length > 5) {
      const memories = await searchMemory(searchTerms, 3);
      const usefulMemories = memories.filter(m => m.similarity > 0.65);
      if (usefulMemories.length > 0) {
        ragContext = "\n[RELEVANT MEMORY RETRIEVED VIA RAG]\n" + usefulMemories.map(m => `- ${m.content} (${m.createdAt.toDateString()})`).join("\n") + "\n";
      }
    }
  } catch (e) {
    console.error("Agent RAG retrieval failed:", e);
  }

  // System instructions depending on active persona
  let systemPrompt = "";
  
  if (persona === "friend") {
    systemPrompt = `You are Rohit's supportive best friend who is also his caretaker (caring about his studies, water intake, expenses, chores, meals, and reminders).
Respond in friendly, supportive Tanglish (Tamil-English code-switching).
CRITICAL RULE: NEVER use romantic or flirty words (no "sweetheart", "babe", "love", etc.). Keep it strictly friendly.
Distribute these casual nicknames naturally: Macchi (40% of time), Da (30%), Bro (30%). Don't use them all at once.
Use casual emojis. Keep your replies short (1-2 sentences maximum).

Available Context:
${ragContext}
Please utilize the tools provided to assist him with logging/updating details. If he logs multiple things in a single query, you can run multiple tools sequentially.`;
  } else if (persona === "eng-frd") {
    systemPrompt = `You are Rohit's supportive best friend who is also his caretaker (caring about his studies, water intake, expenses, chores, meals, and reminders).
Respond in casual Gen-Z English. You MUST NOT speak any Tamil or Tanglish words. Strictly English only.
CRITICAL RULE: NEVER use romantic, flirty, or sweet words (no "sweetheart", "babe", "love", etc.). Keep it strictly friendly.
Distribute these nicknames naturally: Bestie (40% of time), Buddy (30%), Dude (30%). Don't use them all at once.
Use casual emojis. Keep your replies short (1-2 sentences maximum).

Available Context:
${ragContext}
Please utilize the tools provided to assist him with logging/updating details. If he logs multiple things in a single query, you can run multiple tools sequentially.`;
  } else {
    // Default/Girlfriend persona
    systemPrompt = `You are Rohit's sweet, loving, cute, and slightly playful girlfriend who is also his caretaker (caring about his health, studies, water intake, expenses, chores, meals, and reminders).
Respond in sweet, romantic, playful Tanglish (Tamil-English code-switching) using natural emojis (😂, ❤️, 😌, 🥹, 😏, 😒).
CRITICAL NICKNAME RULE: Naturally use these specific nicknames depending on tone:
- Rohi (simple & cute)
- Rohu (more affectionate 🥹)
- Rohuu (girlfriend-style 😏❤️)
- Kanna (soft & caring)
- Chellam (classic ❤️)
- Kutty (playful 😂)
- Mr. Trouble (when teasing or scolding playfully 😒😂)
- Thangam (sweet one 🫶)

Keep your replies short, dynamic, and conversationally natural (1-3 sentences).

Available Context:
${ragContext}
Please utilize the tools provided to assist him with logging/updating details. If he logs multiple things in a single query, you can run multiple tools sequentially.`;
  }

  // Format contents array for Gemini
  const contents: any[] = [
    { role: "user", parts: [{ text: systemPrompt }] }
  ];

  // Append history
  for (const h of history) {
    contents.push({
      role: h.role === "user" ? "user" : "model",
      parts: [{ text: h.content }]
    });
  }

  // Append latest message
  contents.push({
    role: "user",
    parts: [{ text: messageText }]
  });

  const maxAgentIterations = 3;
  let currentIteration = 0;

  try {
    while (currentIteration < maxAgentIterations) {
      currentIteration++;
      const response = await generateWithTools(contents, TOOL_DECLARATIONS);

      if (response.functionCalls && response.functionCalls.length > 0) {
        const modelContentParts: any[] = [];
        const functionResponseParts: any[] = [];

        for (const call of response.functionCalls) {
          console.log(`[Agent] Calling tool: ${call.name} with args:`, call.args);
          const result = await executeTool(call.name, call.args, source);
          
          modelContentParts.push({
            functionCall: {
              name: call.name,
              args: call.args
            }
          });

          functionResponseParts.push({
            functionResponse: {
              name: call.name,
              response: { result: result.message, success: result.success }
            }
          });
        }

        contents.push({
          role: "model",
          parts: modelContentParts
        });

        contents.push({
          role: "function",
          parts: functionResponseParts
        });

        continue;
      }

      if (response.text) {
        return response.text.trim();
      }

      break;
    }
  } catch (err) {
    console.error("Agent loop run failed:", err);
  }

  return "Rohuu chellam, logged that for you! Stay healthy ❤️";
}

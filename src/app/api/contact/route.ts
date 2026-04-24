import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ContactMessage } from "@/models/ContactMessage";
import { sendContactToAdmin, sendContactConfirmation } from "@/lib/resend";

const ADMIN_EMAIL = "daxmanning2@gmail.com";

export async function POST(req: NextRequest) {
  try {
    const { email, title, content } = await req.json();

    if (!email || !title || !content) {
      return NextResponse.json({ error: "Email, title, and content are required" }, { status: 400 });
    }
    const cleanEmail = String(email).toLowerCase().trim();
    const cleanTitle = String(title).trim().slice(0, 200);
    const cleanContent = String(content).trim().slice(0, 5000);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
    if (cleanTitle.length < 3) {
      return NextResponse.json({ error: "Title is too short" }, { status: 400 });
    }
    if (cleanContent.length < 10) {
      return NextResponse.json({ error: "Message is too short" }, { status: 400 });
    }

    await connectDB();
    await ContactMessage.create({ email: cleanEmail, title: cleanTitle, content: cleanContent });

    // Send admin notification and customer confirmation in parallel
    await Promise.allSettled([
      sendContactToAdmin(ADMIN_EMAIL, cleanEmail, cleanTitle, cleanContent),
      sendContactConfirmation(cleanEmail, cleanTitle, cleanContent),
    ]);

    return NextResponse.json({ ok: true, message: "Your message has been sent." });
  } catch (e: unknown) {
    console.error("[Contact]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to send" },
      { status: 500 }
    );
  }
}

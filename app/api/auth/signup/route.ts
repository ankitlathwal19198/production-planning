import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUser, findUserByEmail } from "@/lib/googleSheets";
import { hashPassword, signAuthToken, setAuthCookie } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  createdAt: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name, createdAt } = schema.parse(body);

    console.log("Signup attempt for email:", body);

    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: "Email is already registered" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser({ email, passwordHash, name, createdAt });

    const token = await signAuthToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
    });

    const res = NextResponse.json({ success: true });
    res.cookies.set("saas_auth_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (err: any) {
    console.error(err);
    const message = err?.issues?.[0]?.message || "Something went wrong";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

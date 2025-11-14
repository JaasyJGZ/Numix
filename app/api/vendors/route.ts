import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { hashPassword } from "@/lib/auth"

function isBcryptHash(pwd: string): boolean {
  return typeof pwd === "string" && (pwd.startsWith("$2a$") || pwd.startsWith("$2b$"))
}

export async function GET() {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("vendors")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: { message: error.message, details: (error as any).details, hint: (error as any).hint, code: (error as any).code } },
        { status: 500 }
      )
    }
    return NextResponse.json({ vendors: data ?? [] }, { status: 200 })
  } catch (e) {
    const err = e as Error
    return NextResponse.json({ error: { message: err.message, stack: err.stack } }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const name = body.name as string
    const email = body.email as string
    const password = body.password as string
    const active = body.active ?? true

    if (!name || !email || !password) {
      return NextResponse.json({ error: { message: "name, email y password son requeridos" } }, { status: 400 })
    }

    const passwordToStore = isBcryptHash(password) ? password : await hashPassword(password)

    const { data, error } = await getSupabaseAdmin()
      .from("vendors")
      .insert([{ name, email, password: passwordToStore, active }])
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: { message: error.message, details: (error as any).details, hint: (error as any).hint, code: (error as any).code } },
        { status: 500 }
      )
    }

    return NextResponse.json({ vendor: data }, { status: 201 })
  } catch (e) {
    const err = e as Error
    return NextResponse.json({ error: { message: err.message, stack: err.stack } }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const id = body.id as string
    const name = body.name as string
    const email = body.email as string
    const password = body.password as string | undefined
    const active = body.active as boolean | undefined

    if (!id) {
      return NextResponse.json({ error: { message: "id es requerido" } }, { status: 400 })
    }

    const updatePayload: any = { }
    if (name !== undefined) updatePayload.name = name
    if (email !== undefined) updatePayload.email = email
    if (active !== undefined) updatePayload.active = active
    if (password !== undefined) {
      updatePayload.password = isBcryptHash(password) ? password : await hashPassword(password)
    }

    const { data, error } = await getSupabaseAdmin()
      .from("vendors")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: { message: error.message, details: (error as any).details, hint: (error as any).hint, code: (error as any).code } },
        { status: 500 }
      )
    }

    return NextResponse.json({ vendor: data }, { status: 200 })
  } catch (e) {
    const err = e as Error
    return NextResponse.json({ error: { message: err.message, stack: err.stack } }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: { message: "id es requerido" } }, { status: 400 })
    }

    const { error } = await getSupabaseAdmin().from("vendors").delete().eq("id", id)

    if (error) {
      return NextResponse.json(
        { error: { message: error.message, details: (error as any).details, hint: (error as any).hint, code: (error as any).code } },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e) {
    const err = e as Error
    return NextResponse.json({ error: { message: err.message, stack: err.stack } }, { status: 500 })
  }
}
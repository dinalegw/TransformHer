import { NextResponse } from 'next/server'
import { desc } from 'drizzle-orm'
import { requireMasterAdmin } from '@/lib/auth'
import { getDb } from '@/lib/db/connection'
import { deletedUserArchives } from '@/lib/db/schema'
export async function GET(){try{await requireMasterAdmin();const db=await getDb();if(!db)return NextResponse.json({error:'Database unavailable'},{status:503});const rows=await db.select().from(deletedUserArchives).orderBy(desc(deletedUserArchives.accountDeletedAt)).limit(100);return NextResponse.json({archives:rows.map(r=>({...r,purchaseSnapshot:undefined}))})}catch(err){if(err instanceof Error&&err.message.includes('Unauthorized'))return NextResponse.json({error:'Unauthorized'},{status:401});console.error('[admin/deleted-users] failed');return NextResponse.json({error:'Unable to load archived accounts.'},{status:500})}}

import { NextResponse } from 'next/server'
import { requireMasterAdmin, getUserById, setUserAdmin } from '@/lib/auth'
import { getDefaultPermissions, ALL_PERMISSIONS, type Permission } from '@/lib/permissions'
import { archiveAndDeleteUser, freezeUser, unfreezeUser } from '@/lib/account-lifecycle'

export async function PUT(req:Request,{params}:{params:Promise<{id:string}>}){
 try{const admin=await requireMasterAdmin();const{id}=await params;if(id===admin.id)return NextResponse.json({error:'You cannot change your own lifecycle state here.'},{status:400});const user=await getUserById(id);if(!user)return NextResponse.json({error:'User not found'},{status:404});const body=await req.json();
  if(body.action==='freeze'){if(user.role==='master_admin')return NextResponse.json({error:'Cannot freeze Master Admin'},{status:409});await freezeUser(id,admin,String(body.reason||'Frozen by Master Admin'));return NextResponse.json({success:true,status:'frozen'})}
  if(body.action==='unfreeze'){await unfreezeUser(id);return NextResponse.json({success:true,status:'active'})}
  const updates:{role?:'user'|'admin'|'master_admin';rank?:'junior'|'senior'|'lead'|'master';title?:string;permissions?:Permission[]}={};
  if(body.role!==undefined){if(body.role==='master_admin'&&user.role!=='master_admin')return NextResponse.json({error:'Cannot promote to master admin'},{status:400});updates.role=body.role;if(body.rank!==undefined)updates.rank=body.rank;if(body.title!==undefined)updates.title=body.title;if(body.role==='admin'&&!body.permissions)updates.permissions=getDefaultPermissions('admin')}
  if(body.permissions!==undefined){if(user.role==='master_admin')return NextResponse.json({error:'Cannot modify master admin permissions'},{status:400});updates.permissions=body.permissions.filter((p:string)=>ALL_PERMISSIONS.includes(p as Permission))}
  const updated=await setUserAdmin(id,updates);return NextResponse.json(updated)
 }catch(err){if(err instanceof Error&&err.message.includes('Unauthorized'))return NextResponse.json({error:'Unauthorized'},{status:401});console.error('[admin/users] update failed');return NextResponse.json({error:'Unable to update this user right now.'},{status:500})}
}
export async function DELETE(req:Request,{params}:{params:Promise<{id:string}>}){
 try{const admin=await requireMasterAdmin();const{id}=await params;if(id===admin.id)return NextResponse.json({error:'You cannot delete your own Master Admin account.'},{status:409});const user=await getUserById(id);if(!user)return NextResponse.json({error:'User not found'},{status:404});if(user.role==='master_admin')return NextResponse.json({error:'Cannot delete a Master Admin account.'},{status:409});const body=await req.json().catch(()=>({}));await archiveAndDeleteUser(id,admin,String(body.reason||'Deleted by Master Admin'),'master_admin');return NextResponse.json({success:true,message:'Active account deleted and permitted compliance records archived.'})}catch(err){if(err instanceof Error&&err.message.includes('Unauthorized'))return NextResponse.json({error:'Unauthorized'},{status:401});console.error('[admin/users] delete failed');return NextResponse.json({error:'Unable to delete this user right now.'},{status:500})}
}

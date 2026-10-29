import { createFileRoute,redirect } from '@tanstack/react-router';
import { mongo } from '@/api/client';
import { Shell } from '@/frontend/shell';
import { workspaceQuery } from '@/frontend/queries';
export const Route=createFileRoute('/_authenticated')({ssr:false,beforeLoad:async()=>{const {data}=await mongo.auth.getUser();if(!data.user)throw redirect({to:'/'})},loader:({context})=>context.queryClient.ensureQueryData(workspaceQuery),component:Shell,errorComponent:({error})=><div role="alert">{error instanceof Error?error.message:'Não foi possível carregar os dados'}</div>,notFoundComponent:()=> <div>Não encontrado</div>});

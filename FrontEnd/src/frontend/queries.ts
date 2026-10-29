import { queryOptions } from '@tanstack/react-query';
import { getWorkspace,getClubData } from '@/api/client';
export const workspaceQuery = queryOptions({queryKey:['workspace'],queryFn:()=>getWorkspace(),staleTime:30000});
export const clubQuery=(club:string)=>queryOptions({queryKey:['club',club],queryFn:()=>getClubData({data:{club}}),staleTime:15000});

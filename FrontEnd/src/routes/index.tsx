import { createFileRoute } from '@tanstack/react-router';
import { Auth } from '@/frontend/auth';
import { pageHead } from '@/frontend/meta';
export const Route = createFileRoute('/')({head:()=>pageHead('Acesso ao clube'),component:Auth});

import { createFileRoute,Link } from '@tanstack/react-router';
import { useEffect,useState } from 'react';
import { mongo } from '@/api/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { pageHead } from '@/frontend/meta';
export const Route=createFileRoute('/reset-password')({head:()=>pageHead('Recuperar senha'),component:Reset});
function Reset(){const [recovery,setRecovery]=useState(false);const [password,setPassword]=useState('');const [message,setMessage]=useState('');useEffect(()=>{setRecovery(new URLSearchParams(window.location.hash.slice(1)).get('type')==='recovery')},[]);return <main className="mx-auto max-w-md py-24 px-6"><h1 className="text-4xl mb-6">Nova senha</h1>{recovery?<form className="grid gap-4" onSubmit={async e=>{e.preventDefault();const r=await mongo.auth.updateUser({password});setMessage(r.error?.message??'Senha atualizada')}}><Input aria-label="Nova senha" type="password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)}/><Button>Salvar senha</Button></form>:<p>Abra o link de recuperação enviado por e-mail.</p>}<p role="status">{message}</p><Button variant="link" asChild><Link to="/">Voltar</Link></Button></main>}

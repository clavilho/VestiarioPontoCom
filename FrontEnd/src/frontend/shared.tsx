import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog,DialogContent,DialogHeader,DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/i18n';
import { ClipboardList } from 'lucide-react';
export function Field({label,children}:{label:string;children:ReactNode}){return <Label className="grid gap-2 text-xs font-semibold">{label}{children}</Label>}
export function Select({value,onChange,options,label}:{value:string;onChange:(v:string)=>void;options:{value:string;label:string}[];label?:string}){return <select aria-label={label} className="h-10 rounded-md border border-input bg-card px-3 text-sm min-w-0" value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>}
export function Modal({title,open,close,children}:{title:string;open:boolean;close:()=>void;children:ReactNode}){return <Dialog open={open} onOpenChange={v=>{if(!v)close()}}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle className="text-3xl">{title}</DialogTitle></DialogHeader>{children}</DialogContent></Dialog>}
export function Empty(){const {t}=useI18n();return <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><ClipboardList className="mb-4 size-9 opacity-40"/><p className="text-sm">{t('common.empty')}</p></div>}
export function Title({title,children}:{title:string;children?:ReactNode}){return <div className="flex flex-wrap items-center justify-between gap-4 mb-7"><h1 className="text-4xl font-semibold">{title}</h1><div className="flex flex-wrap gap-2">{children}</div></div>}
export function Stat({label,value,icon}:{label:string;value:ReactNode;icon?:ReactNode}){return <article className="stat"><div className="flex justify-between gap-3"><span className="text-xs font-medium text-muted-foreground">{label}</span>{icon}</div><div className="font-display text-4xl font-semibold mt-3">{value}</div></article>}
export function FormFooter({busy}:{busy?:boolean}){const {t}=useI18n();return <div className="flex justify-end pt-3"><Button disabled={busy} type="submit">{busy?t('common.loading'):t('common.save')}</Button></div>}
export function Search({value,onChange}:{value:string;onChange:(v:string)=>void}){const {t}=useI18n();return <Input aria-label={t('common.search')} placeholder={t('common.search')} value={value} onChange={e=>onChange(e.target.value)} className="max-w-xs bg-card"/>}
export function money(n:number,currency='BRL',lang='pt-BR'){return new Intl.NumberFormat(lang,{style:'currency',currency}).format(n)}
export function shortDate(d:string,lang='pt-BR'){return new Intl.DateTimeFormat(lang,{day:'2-digit',month:'short'}).format(new Date(d.includes('T')?d:d+'T12:00:00'))}
export function isoDate(){return new Date().toISOString().slice(0,10)}

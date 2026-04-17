'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import logo from '../pictures/logo.png';

type AccountType='ADMIN'|'PLAYER';
type SessionUser={id:string;email:string;nickname:string;accountType:AccountType;moderatorLevel:string|null};
type LoginResponse={accessToken:string;expiresIn:number;tokenType:string;user:SessionUser};
const API_BASE=(process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/,'')||'http://localhost:3001/api');
const STORAGE_KEY='emercoria.session';
const cn=(...v:(string|false|undefined|null)[])=>v.filter(Boolean).join(' ');
const stats=[{k:'СВЯТ',v:'01'},{k:'ИГРАЧИ',v:'1.5K+'},{k:'ПАЗАР',v:'24/7'}];
const CrownIcon=({className='' }:{className?:string})=><svg viewBox='0 0 24 24' className={className} fill='none' aria-hidden='true'><path d='m4 17 2-8 6 4 6-4 2 8H4Z' stroke='currentColor' strokeWidth='1.8' strokeLinejoin='round'/><path d='M8.5 7.5a1 1 0 1 0 0-.001M12 5.5a1 1 0 1 0 0-.001M15.5 7.5a1 1 0 1 0 0-.001' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round'/></svg>;
const MailIcon=({className='' }:{className?:string})=><svg viewBox='0 0 24 24' className={className} fill='none' aria-hidden='true'><path d='M4 7.5h16v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z' stroke='currentColor' strokeWidth='1.8'/><path d='m5 8 7 5 7-5' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'/></svg>;
const LockIcon=({className='' }:{className?:string})=><svg viewBox='0 0 24 24' className={className} fill='none' aria-hidden='true'><path d='M7 10.25V8.5a5 5 0 0 1 10 0v1.75' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round'/><rect x='4.75' y='10.25' width='14.5' height='9' rx='2.5' stroke='currentColor' strokeWidth='1.8'/><path d='M12 13.5v2.5' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round'/></svg>;
const ShieldIcon=({className='' }:{className?:string})=><svg viewBox='0 0 24 24' className={className} fill='none' aria-hidden='true'><path d='M12 3.75 18 6v5.1c0 4.1-2.36 7.86-6 9.65-3.64-1.79-6-5.55-6-9.65V6l6-2.25Z' stroke='currentColor' strokeWidth='1.8' strokeLinejoin='round'/><path d='m9.6 11.9 1.5 1.5 3.4-3.8' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'/></svg>;
function persistSession(data:LoginResponse){if(typeof window==='undefined') return;window.sessionStorage.setItem(STORAGE_KEY,JSON.stringify(data));}
function destination(role:AccountType){return role==='ADMIN'?'/admin':'/player';}
function Line({className='' }:{className?:string}){return <div className={cn('pointer-events-none absolute left-1/2 h-px -translate-x-1/2 bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent',className)}/>;}
function Stat({k,v}:{k:string;v:string}){return <div className='relative overflow-hidden rounded-[18px] border border-emerald-400/16 bg-[linear-gradient(180deg,rgba(6,18,24,.9),rgba(2,7,12,.82))] px-4 py-3 shadow-[0_14px_28px_rgba(0,0,0,.22)]'><span className='pointer-events-none absolute inset-0 bg-[radial-gradient(160px_70px_at_18%_0,rgba(255,255,255,.06),transparent_62%),radial-gradient(220px_120px_at_100%_0,rgba(0,255,210,.08),transparent_56%)] opacity-90'/><div className='relative text-[10px] font-black uppercase tracking-[.22em] text-white/40'>{k}</div><div className='relative mt-2 text-[24px] font-black tracking-[.04em] text-white'>{v}</div></div>;}
function Field({label,placeholder,type='text',icon,value,onChange}:{label:string;placeholder:string;type?:string;icon:React.ReactNode;value:string;onChange:(value:string)=>void;}){return <label className='block space-y-2.5'><span className='block px-1 text-[11px] font-black uppercase tracking-[.22em] text-white/54'>{label}</span><div className='group relative flex h-[58px] items-center overflow-hidden rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(6,18,24,.96),rgba(3,9,14,.98))] transition-all duration-200 hover:border-emerald-400/40 focus-within:border-emerald-400/68 focus-within:shadow-[0_0_0_1px_rgba(0,255,210,.08),0_16px_28px_rgba(0,0,0,.2)]'><span className='pointer-events-none absolute inset-[1px] rounded-[17px] border border-white/[0.04]'/><span className='pointer-events-none absolute inset-0 bg-[radial-gradient(180px_80px_at_18%_0,rgba(255,255,255,.07),transparent_62%),radial-gradient(240px_120px_at_100%_0,rgba(0,255,210,.08),transparent_58%)] opacity-90'/><span className='relative ml-4 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-400/14 bg-emerald-500/6 text-emerald-200/90'>{icon}</span><input value={value} onChange={(e)=>onChange(e.target.value)} type={type} placeholder={placeholder} className='relative h-full w-full bg-transparent px-3 pr-4 text-[15px] font-bold tracking-[.02em] text-white outline-none placeholder:text-white/28'/></div></label>;}
function PrimaryButton({children,disabled}:{children:React.ReactNode;disabled?:boolean}){return <button disabled={disabled} type='submit' className='group relative inline-flex h-[54px] w-full items-center justify-center overflow-hidden rounded-[18px] border border-emerald-300/75 bg-[linear-gradient(135deg,rgba(16,185,129,.78),rgba(6,78,59,.98)_42%,rgba(3,30,34,.99))] px-5 text-[14px] font-black uppercase tracking-[.18em] text-white shadow-[0_22px_46px_rgba(0,0,0,.42),0_0_34px_rgba(16,185,129,.14)] transition-all duration-300 hover:-translate-y-[1px] hover:border-emerald-100/95 hover:shadow-[0_26px_52px_rgba(0,0,0,.48),0_0_44px_rgba(16,185,129,.2)] disabled:cursor-not-allowed disabled:opacity-70'><span className='pointer-events-none absolute inset-[1px] rounded-[17px] bg-[linear-gradient(180deg,rgba(3,13,18,.985),rgba(2,8,12,.99))]'/><span className='pointer-events-none absolute inset-[1px] rounded-[17px] bg-[radial-gradient(170px_90px_at_18%_0,rgba(255,255,255,.14),transparent_62%),radial-gradient(260px_120px_at_100%_0,rgba(0,255,210,.1),transparent_56%)] opacity-95'/><span className='pointer-events-none absolute inset-[1px] rounded-[17px] border border-white/[0.05]'/><span className='pointer-events-none absolute left-1/2 top-[1px] h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-emerald-100/40 to-transparent opacity-80'/><span className='pointer-events-none absolute bottom-[1px] left-1/2 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent'/><span className='relative'>{children}</span></button>;}
function SecondaryButton({children}:{children:React.ReactNode}){return <button type='button' className='group relative inline-flex h-[52px] w-full items-center justify-center overflow-hidden rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(6,14,22,.94),rgba(3,8,13,.98))] px-5 text-[13px] font-black uppercase tracking-[.18em] text-white/82 transition-all duration-300 hover:-translate-y-[1px] hover:border-emerald-400/45'><span className='pointer-events-none absolute inset-[1px] rounded-[17px] border border-white/[0.04]'/><span className='pointer-events-none absolute inset-0 bg-[radial-gradient(150px_70px_at_18%_0,rgba(255,255,255,.07),transparent_62%),radial-gradient(220px_110px_at_100%_0,rgba(0,255,210,.08),transparent_58%)] opacity-90'/><span className='relative'>{children}</span></button>;}

export default function LoginPage(){
  const router=useRouter();
  const [email,setEmail]=useState('admin@gmail.com');
  const [password,setPassword]=useState('12345');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const previewRole=useMemo(()=>(email.trim().toLowerCase()==='admin@gmail.com'?'ADMIN':'PLAYER'),[email]);
  async function onSubmit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(loading) return;
    setLoading(true);setError('');
    try{
      const res=await fetch(`${API_BASE}/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
      const data=await res.json().catch(()=>null) as LoginResponse|{message?:string}|null;
      if(!res.ok||!data||!('user' in data)){throw new Error(typeof data?.message==='string'?data.message:'Логинът не бе успешен.');}
      persistSession(data);
      router.replace(destination(data.user.accountType));
      router.refresh();
    }catch(err){setError(err instanceof Error?err.message:'Възникна неочаквана грешка.');}
    finally{setLoading(false);}
  }
  return(
    <main className='relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#02080d,#02060b)] text-white'>
      <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(980px_440px_at_50%_-10%,rgba(0,255,210,.08),transparent_56%),radial-gradient(720px_280px_at_10%_18%,rgba(80,170,255,.08),transparent_54%),radial-gradient(620px_260px_at_100%_0,rgba(16,185,129,.08),transparent_56%)]'/>
      <div className='pointer-events-none absolute inset-0 opacity-[.1] [background-image:linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:72px_72px]'/>
      <div className='relative mx-auto flex min-h-screen w-full max-w-[1360px] items-center px-5 py-8 sm:px-8 lg:px-10'>
        <div className='grid w-full items-stretch gap-6 lg:grid-cols-[1.08fr_.92fr]'>
          <section className='relative overflow-hidden rounded-[28px] border border-emerald-400/24 bg-[linear-gradient(180deg,rgba(6,18,24,.92),rgba(2,7,12,.78))] p-5 shadow-[0_24px_64px_rgba(0,0,0,.45)] sm:p-7 lg:p-8'>
            <span className='pointer-events-none absolute inset-0 bg-[radial-gradient(360px_160px_at_18%_0,rgba(255,255,255,.08),transparent_60%),radial-gradient(320px_180px_at_100%_0,rgba(0,255,210,.12),transparent_56%),radial-gradient(440px_260px_at_50%_100%,rgba(16,185,129,.08),transparent_60%)] opacity-95'/>
            <span className='pointer-events-none absolute inset-[1px] rounded-[27px] border border-white/[0.04]'/><Line className='top-0 w-[72%]'/><Line className='bottom-0 w-[68%]'/>
            <div className='relative flex h-full flex-col'>
              <div className='inline-flex w-fit items-center gap-2 rounded-full border border-emerald-300/22 bg-emerald-500/8 px-3 py-2 text-[11px] font-black uppercase tracking-[.2em] text-emerald-100'><CrownIcon className='h-4 w-4'/><span>Empire Strategy Platform</span></div>
              <div className='mt-7 max-w-[640px]'>
                <div className='text-[12px] font-black uppercase tracking-[.24em] text-white/48'>eMercoria</div>
                <h1 className='mt-3 text-[34px] font-black uppercase leading-[1.02] tracking-[.04em] text-white sm:text-[46px] lg:text-[56px]'>Влез в света на търговията, властта и империята.</h1>
                <p className='mt-5 max-w-[560px] text-[15px] font-bold leading-7 text-white/62 sm:text-[16px]'>След успешен вход системата автоматично те отвежда към правилния панел според ролята на профила.</p>
              </div>
              <div className='mt-8 flex flex-wrap gap-3'>{stats.map((it)=><Stat key={it.k} {...it}/>)}</div>
              <div className='mt-6 grid gap-3 sm:grid-cols-2'>
                <div className='rounded-[20px] border border-emerald-400/18 bg-emerald-500/6 px-4 py-4'><div className='flex items-center gap-3'><ShieldIcon className='h-8 w-8 text-emerald-200'/><div><div className='text-[11px] font-black uppercase tracking-[.2em] text-white/42'>Admin flow</div><div className='mt-1 text-[15px] font-black text-white'>/admin dashboard</div></div></div></div>
                <div className='rounded-[20px] border border-sky-400/18 bg-sky-500/6 px-4 py-4'><div className='flex items-center gap-3'><CrownIcon className='h-8 w-8 text-sky-200'/><div><div className='text-[11px] font-black uppercase tracking-[.2em] text-white/42'>Player flow</div><div className='mt-1 text-[15px] font-black text-white'>/player profile</div></div></div></div>
              </div>
              <div className='relative mt-8 flex min-h-[320px] flex-1 items-center justify-center overflow-hidden rounded-[26px] border border-emerald-400/18 bg-[linear-gradient(180deg,rgba(4,14,20,.78),rgba(2,7,12,.58))] p-6 sm:p-8'>
                <span className='pointer-events-none absolute inset-0 bg-[radial-gradient(340px_220px_at_50%_50%,rgba(0,255,210,.14),transparent_58%),radial-gradient(240px_120px_at_50%_12%,rgba(255,255,255,.08),transparent_62%)]'/><span className='pointer-events-none absolute inset-0 opacity-[.14] [background-image:radial-gradient(circle_at_center,rgba(255,255,255,.9)_1px,transparent_1.2px)] [background-size:28px_28px]'/><div className='relative'><div className='absolute inset-[-10%] rounded-full bg-emerald-400/8 blur-3xl'/><Image src={logo} alt='eMercoria logo' priority className='relative mx-auto h-auto w-[min(100%,520px)] drop-shadow-[0_0_26px_rgba(0,255,210,.22)]'/></div>
              </div>
            </div>
          </section>
          <section className='relative overflow-hidden rounded-[28px] border border-emerald-400/34 bg-[linear-gradient(180deg,rgba(3,11,16,.985),rgba(2,7,12,.985))] p-[1.5px] shadow-[0_26px_70px_rgba(0,0,0,.62)]'>
            <div className='relative h-full overflow-hidden rounded-[27px] bg-[linear-gradient(180deg,rgba(2,8,13,.985),rgba(2,6,11,.985))] p-5 sm:p-7'>
              <span className='pointer-events-none absolute inset-0 bg-[radial-gradient(280px_140px_at_22%_0,rgba(255,255,255,.08),transparent_62%),radial-gradient(340px_180px_at_100%_0,rgba(0,255,210,.1),transparent_58%)] opacity-95'/><span className='pointer-events-none absolute inset-[1px] rounded-[26px] border border-white/[0.04]'/><Line className='top-0 w-[70%]'/><Line className='bottom-0 w-[74%]'/>
              <div className='relative mx-auto flex h-full w-full max-w-[480px] flex-col justify-center'>
                <div className='mb-6'>
                  <div className='inline-flex items-center gap-2 rounded-full border border-emerald-300/18 bg-emerald-500/8 px-3 py-2 text-[10px] font-black uppercase tracking-[.22em] text-emerald-100/92'>Secure Login</div>
                  <h2 className='mt-4 text-[30px] font-black uppercase tracking-[.06em] text-white sm:text-[34px]'>Вход</h2>
                  <p className='mt-3 text-[14px] font-bold leading-6 text-white/54'>Въведи имейл и парола. При ADMIN профил ще отидеш в админ панела, при PLAYER профил в играчкия панел.</p>
                </div>
                <form onSubmit={onSubmit} className='space-y-4'>
                  <Field label='Имейл' placeholder='admin@gmail.com' value={email} onChange={setEmail} icon={<MailIcon className='h-[18px] w-[18px]'/>}/>
                  <Field label='Парола' type='password' placeholder='••••••••••••' value={password} onChange={setPassword} icon={<LockIcon className='h-[18px] w-[18px]'/>}/>
                  <div className='flex items-center justify-between gap-4 px-1 pt-1'>
                    <label className='inline-flex items-center gap-2.5 text-[12px] font-black uppercase tracking-[.12em] text-white/48'><input type='checkbox' className='h-4 w-4 rounded border border-emerald-400/30 bg-transparent accent-emerald-400'/><span>Запомни ме</span></label>
                    <span className='rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-[.16em] text-white/62'>{previewRole}</span>
                  </div>
                  {error?<div className='rounded-[16px] border border-rose-400/22 bg-rose-500/8 px-4 py-3 text-[13px] font-bold text-rose-100'>{error}</div>:null}
                  <div className='pt-2'><PrimaryButton disabled={loading}>{loading?'Влизане...':'Влизане'}</PrimaryButton></div>
                  <div className='pt-1'><SecondaryButton>Създай профил</SecondaryButton></div>
                </form>
                <div className='mt-7 rounded-[20px] border border-white/8 bg-[linear-gradient(180deg,rgba(6,14,22,.84),rgba(3,8,13,.92))] px-4 py-4'>
                  <div className='text-[11px] font-black uppercase tracking-[.2em] text-white/42'>Бърз тест</div>
                  <div className='mt-3 grid gap-3 sm:grid-cols-2'>
                    <div className='rounded-[16px] border border-emerald-400/14 bg-emerald-500/6 px-4 py-3'><div className='text-[10px] font-black uppercase tracking-[.18em] text-white/42'>Admin</div><div className='mt-2 text-[15px] font-black tracking-[.04em] text-white'>admin@gmail.com / 12345</div></div>
                    <div className='rounded-[16px] border border-sky-400/14 bg-sky-500/6 px-4 py-3'><div className='text-[10px] font-black uppercase tracking-[.18em] text-white/42'>Player</div><div className='mt-2 text-[15px] font-black tracking-[.04em] text-white'>shadowfox@gmail.com / 123</div></div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

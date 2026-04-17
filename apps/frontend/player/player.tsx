'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type AccountType='ADMIN'|'PLAYER';
type SessionData={accessToken:string;expiresIn:number;tokenType:string;user:{id:string;email:string;nickname:string;accountType:AccountType;moderatorLevel:string|null}};
const STORAGE_KEY='emercoria.session';
const readSession=()=>{if(typeof window==='undefined') return null;try{return JSON.parse(window.sessionStorage.getItem(STORAGE_KEY)||'null') as SessionData|null;}catch{return null;}};
const Tile=({label,value}:{label:string;value:string})=><div className='rounded-[20px] border border-white/10 bg-white/5 px-4 py-4'><div className='text-[10px] font-black uppercase tracking-[.2em] text-white/40'>{label}</div><div className='mt-2 text-[22px] font-black text-white'>{value}</div></div>;

export default function PlayerPage(){
  const router=useRouter();
  const [ready,setReady]=useState(false);
  const [session,setSession]=useState<SessionData|null>(null);
  useEffect(()=>{const next=readSession();if(!next){router.replace('/login');return;}if(next.user.accountType!=='PLAYER'){router.replace('/admin');return;}setSession(next);setReady(true);},[router]);
  const nickname=useMemo(()=>session?.user.nickname||'Играч',[session]);
  if(!ready) return <main className='min-h-screen bg-[#02080d]' />;
  return(
    <main className='min-h-screen bg-[linear-gradient(180deg,#02080d,#071019)] px-5 py-8 text-white sm:px-8'>
      <div className='mx-auto max-w-[1240px]'>
        <section className='overflow-hidden rounded-[30px] border border-sky-400/24 bg-[linear-gradient(180deg,rgba(7,17,26,.94),rgba(3,8,13,.9))] p-6 shadow-[0_26px_70px_rgba(0,0,0,.45)] sm:p-8'>
          <div className='flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between'>
            <div>
              <div className='inline-flex items-center rounded-full border border-sky-300/20 bg-sky-500/10 px-3 py-2 text-[11px] font-black uppercase tracking-[.22em] text-sky-100'>Player hub</div>
              <h1 className='mt-4 text-[36px] font-black uppercase tracking-[.05em] sm:text-[48px]'>Добре дошъл, {nickname}</h1>
              <p className='mt-3 max-w-[760px] text-[15px] font-bold leading-7 text-white/58'>Това е базовият player дизайн. След login с PLAYER профил redirect-ът идва тук автоматично.</p>
            </div>
            <button onClick={()=>{window.sessionStorage.removeItem(STORAGE_KEY);router.replace('/login');}} className='rounded-[18px] border border-white/12 bg-white/5 px-5 py-3 text-[12px] font-black uppercase tracking-[.18em] text-white/86 transition hover:border-sky-400/45 hover:bg-sky-500/10'>Изход</button>
          </div>
          <div className='mt-8 grid gap-4 md:grid-cols-4'>
            <Tile label='Роля' value='PLAYER'/>
            <Tile label='Ник' value={session?.user.nickname||'-'}/>
            <Tile label='Имейл' value={session?.user.email||'-'}/>
            <Tile label='Статус' value='ONLINE'/>
          </div>
        </section>
        <section className='mt-6 grid gap-6 lg:grid-cols-[1.06fr_.94fr]'>
          <div className='rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(5,14,20,.94),rgba(3,8,12,.92))] p-6'>
            <div className='text-[12px] font-black uppercase tracking-[.22em] text-white/42'>Основни секции</div>
            <div className='mt-4 grid gap-3 sm:grid-cols-2'>
              {['Моята нация','Ресурси','Пазар','Армия'].map((item)=><div key={item} className='rounded-[20px] border border-sky-400/14 bg-sky-500/6 px-4 py-4 text-[15px] font-black text-white'>{item}</div>)}
            </div>
          </div>
          <div className='rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(5,14,20,.94),rgba(3,8,12,.92))] p-6'>
            <div className='text-[12px] font-black uppercase tracking-[.22em] text-white/42'>Preview</div>
            <div className='mt-4 space-y-3'>
              {[
                ['Злато','12,400'],
                ['Население','84,200'],
                ['Енергия','91%'],
              ].map(([label,value])=><div key={label} className='flex items-center justify-between rounded-[18px] border border-white/8 bg-white/5 px-4 py-4'><span className='text-[13px] font-black uppercase tracking-[.14em] text-white/56'>{label}</span><span className='text-[20px] font-black text-white'>{value}</span></div>)}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

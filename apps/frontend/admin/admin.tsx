'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type AccountType='ADMIN'|'PLAYER';
type SessionData={accessToken:string;expiresIn:number;tokenType:string;user:{id:string;email:string;nickname:string;accountType:AccountType;moderatorLevel:string|null}};
const STORAGE_KEY='emercoria.session';
const readSession=()=>{if(typeof window==='undefined') return null;try{return JSON.parse(window.sessionStorage.getItem(STORAGE_KEY)||'null') as SessionData|null;}catch{return null;}};
const Card=({title,value,accent}:{title:string;value:string;accent:string})=><div className='rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(6,18,24,.92),rgba(2,7,12,.86))] p-5'><div className='text-[11px] font-black uppercase tracking-[.2em] text-white/42'>{title}</div><div className={`mt-3 text-[28px] font-black ${accent}`}>{value}</div></div>;

export default function AdminPage(){
  const router=useRouter();
  const [ready,setReady]=useState(false);
  const [session,setSession]=useState<SessionData|null>(null);
  useEffect(()=>{const next=readSession();if(!next){router.replace('/login');return;}if(next.user.accountType!=='ADMIN'){router.replace('/player');return;}setSession(next);setReady(true);},[router]);
  const nickname=useMemo(()=>session?.user.nickname||'ADMIN',[session]);
  if(!ready) return <main className='min-h-screen bg-[#02080d]' />;
  return(
    <main className='min-h-screen bg-[linear-gradient(180deg,#02080d,#041118)] px-5 py-8 text-white sm:px-8'>
      <div className='mx-auto max-w-[1280px]'>
        <section className='overflow-hidden rounded-[30px] border border-emerald-400/24 bg-[linear-gradient(180deg,rgba(6,18,24,.94),rgba(2,7,12,.9))] p-6 shadow-[0_26px_70px_rgba(0,0,0,.45)] sm:p-8'>
          <div className='flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between'>
            <div>
              <div className='inline-flex items-center rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-2 text-[11px] font-black uppercase tracking-[.22em] text-emerald-100'>Admin panel</div>
              <h1 className='mt-4 text-[36px] font-black uppercase tracking-[.05em] sm:text-[48px]'>Добре дошъл, {nickname}</h1>
              <p className='mt-3 max-w-[760px] text-[15px] font-bold leading-7 text-white/58'>Това е базовият админ дизайн. След login с ADMIN профил redirect-ът идва тук автоматично.</p>
            </div>
            <button onClick={()=>{window.sessionStorage.removeItem(STORAGE_KEY);router.replace('/login');}} className='rounded-[18px] border border-white/12 bg-white/5 px-5 py-3 text-[12px] font-black uppercase tracking-[.18em] text-white/86 transition hover:border-emerald-400/45 hover:bg-emerald-500/10'>Изход</button>
          </div>
          <div className='mt-8 grid gap-4 md:grid-cols-3'>
            <Card title='Роля' value='ADMIN' accent='text-emerald-300'/>
            <Card title='Потребител' value={session?.user.email||'-'} accent='text-white'/>
            <Card title='Модерация' value={session?.user.moderatorLevel||'OWNER'} accent='text-sky-300'/>
          </div>
        </section>
        <section className='mt-6 grid gap-6 lg:grid-cols-[1.1fr_.9fr]'>
          <div className='rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(5,14,20,.94),rgba(3,8,12,.92))] p-6'>
            <div className='text-[12px] font-black uppercase tracking-[.22em] text-white/42'>Quick actions</div>
            <div className='mt-4 grid gap-3 sm:grid-cols-2'>
              {['Управление на играчи','Пазарен контрол','Логове и сигнали','Настройки на света'].map((item)=><div key={item} className='rounded-[20px] border border-emerald-400/14 bg-emerald-500/6 px-4 py-4 text-[15px] font-black text-white'>{item}</div>)}
            </div>
          </div>
          <div className='rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(5,14,20,.94),rgba(3,8,12,.92))] p-6'>
            <div className='text-[12px] font-black uppercase tracking-[.22em] text-white/42'>Preview</div>
            <div className='mt-4 space-y-3'>
              {[
                ['Активни играчи','1,542'],
                ['Отворени сигнали','12'],
                ['Пазарни аномалии','03'],
              ].map(([label,value])=><div key={label} className='flex items-center justify-between rounded-[18px] border border-white/8 bg-white/5 px-4 py-4'><span className='text-[13px] font-black uppercase tracking-[.14em] text-white/56'>{label}</span><span className='text-[20px] font-black text-white'>{value}</span></div>)}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import logo from '../pictures/logo.png';
import background from '../pictures/background.png';
import leftPanelPicture from '../pictures/left_panel_picture.png';
import leftPanelPosition from '../pictures/left_panel_position.png';
import leftPanelTressury from '../pictures/left_panel_tressury.png';
import leftPanelMercoria from '../pictures/left_panel_mercoria.png';
import leftPanelGold from '../pictures/left_panel_gold.png';
import leftPanelMoney from '../pictures/left_panel_money.png';

type AccountType='ADMIN'|'PLAYER';
type SessionData={accessToken:string;expiresIn:number;tokenType:string;user:{id:string;email:string;nickname:string;accountType:AccountType;moderatorLevel:string|null}};
const STORAGE_KEY='emercoria.session';
const readSession=()=>{if(typeof window==='undefined') return null;try{return JSON.parse(window.sessionStorage.getItem(STORAGE_KEY)||'null') as SessionData|null;}catch{return null;}};

const Btn=({label,children}:{label:string;children:React.ReactNode})=><button type='button' aria-label={label} className='flex h-[46px] w-[46px] items-center justify-center border border-black/10 bg-white text-[#1b1d21] shadow-[0_8px_24px_rgba(15,23,42,.08)] transition hover:bg-[#f3f4f6]'><span className='h-[22px] w-[22px]'>{children}</span></button>;
const ProfileIcon=()=>(<svg viewBox='0 0 24 24' fill='none' aria-hidden='true' className='h-full w-full'><path d='M12 12.25a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Z' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'/><path d='M4.75 19.25a7.25 7.25 0 0 1 14.5 0' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'/></svg>);
const MessagesIcon=()=>(<svg viewBox='0 0 24 24' fill='none' aria-hidden='true' className='h-full w-full'><path d='M6.25 17.25 3.75 19V7.25A3.25 3.25 0 0 1 7 4h10a3.25 3.25 0 0 1 3.25 3.25v6.5A3.25 3.25 0 0 1 17 17H6.25Z' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'/><path d='M8 8.5h8M8 12h5.5' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round'/></svg>);
const NotificationsIcon=()=>(<svg viewBox='0 0 24 24' fill='none' aria-hidden='true' className='h-full w-full'><path d='M7 16.75h10l-1.05-1.55A4.92 4.92 0 0 1 15.1 12.4V10.9a3.1 3.1 0 1 0-6.2 0v1.5c0 1-.3 1.98-.85 2.8L7 16.75Z' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'/><path d='M10 19a2.15 2.15 0 0 0 4 0' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round'/><path d='M12 4.1v.8' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round'/></svg>);
const MapIcon=()=>(<svg viewBox='0 0 24 24' fill='none' aria-hidden='true' className='h-full w-full'><path d='m4.75 6.25 4.5-1.5 5.5 2 5-2 1.5.5v12.5l-4.5 1.5-5.5-2-5 2-1.5-.5V6.25Z' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'/><path d='M9.25 4.75v12.5M14.75 6.75v12.5' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'/></svg>);
const SettingsIcon=()=>(<svg viewBox='0 0 24 24' fill='none' aria-hidden='true' className='h-full w-full'><path d='M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z' stroke='currentColor' strokeWidth='1.8'/><path d='M19.15 13.1v-2.2l-1.8-.5a5.8 5.8 0 0 0-.55-1.3l.95-1.6-1.55-1.55-1.6.95a5.8 5.8 0 0 0-1.3-.55l-.5-1.8h-2.2l-.5 1.8a5.8 5.8 0 0 0-1.3.55l-1.6-.95-1.55 1.55.95 1.6a5.8 5.8 0 0 0-.55 1.3l-1.8.5v2.2l1.8.5a5.8 5.8 0 0 0 .55 1.3l-.95 1.6 1.55 1.55 1.6-.95c.4.24.84.42 1.3.55l.5 1.8h2.2l.5-1.8c.46-.13.9-.31 1.3-.55l1.6.95 1.55-1.55-.95-1.6c.24-.4.42-.84.55-1.3l1.8-.5Z' stroke='currentColor' strokeWidth='1.45' strokeLinecap='round' strokeLinejoin='round'/></svg>);

export default function PlayerPage(){
  const router=useRouter();
  const inputRef=useRef<HTMLInputElement|null>(null);
  const [ready,setReady]=useState(false);
  const [avatarUrl,setAvatarUrl]=useState<string|null>(null);

  useEffect(()=>{
    const next=readSession();
    if(!next){router.replace('/login');return;}
    if(next.user.accountType!=='PLAYER'){router.replace('/admin');return;}
    setReady(true);
  },[router]);

  useEffect(()=>()=>{if(avatarUrl) URL.revokeObjectURL(avatarUrl);},[avatarUrl]);

  if(!ready) return <main className='min-h-screen bg-[#02080d]' />;

  const leftPanel={width:250,minWidth:250,flex:'0 0 250px',borderRight:'1px solid #000',overflow:'hidden'} as const;
  const middlePanel={width:450,minWidth:450,flex:'0 0 450px'} as const;
  const rightPanel={minWidth:0,flex:'1 1 auto',borderLeft:'1px solid #000'} as const;

  const pickAvatar=()=>inputRef.current?.click();
  const setAvatar=(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0];
    if(!file||!file.type.startsWith('image/')) return;
    setAvatarUrl(prev=>{if(prev) URL.revokeObjectURL(prev);return URL.createObjectURL(file);});
    e.target.value='';
  };

  return(
    <main className='min-h-screen text-[#1b1d21]' style={{backgroundImage:`url(${background.src})`,backgroundSize:'cover',backgroundPosition:'center',backgroundRepeat:'no-repeat',backgroundAttachment:'fixed'}}>
      <div className='mx-auto flex min-h-screen flex-col' style={{width:'70%'}}>
        <header className='flex h-[70px] items-center border-x border-b border-black/10 bg-[#f7f7f8] pr-4'>
          <div className='flex h-[70px] w-[240px] shrink-0 items-center justify-center overflow-hidden'>
            <Image src={logo} alt='eMercoria logo' priority width={180} height={58} className='h-[58px] w-auto object-contain' sizes='180px' style={{transform:'scale(2.15)',transformOrigin:'center'}}/>
          </div>
          <div className='flex items-center gap-3' style={{marginLeft:25}}>
            <Btn label='Профил'><ProfileIcon/></Btn>
            <Btn label='Съобщения'><MessagesIcon/></Btn>
            <Btn label='Известия'><NotificationsIcon/></Btn>
            <Btn label='Карта'><MapIcon/></Btn>
            <Btn label='Настройки'><SettingsIcon/></Btn>
          </div>
        </header>

        <section className='flex-1 border-l border-b border-black bg-[#f7f7f8]' style={{display:'flex',minHeight:'calc(100vh - 70px)'}}>
          <aside aria-label='left panel' style={leftPanel}>
            <div className='flex w-full flex-col items-center pt-0'>
              <div style={{position:'relative',width:250,height:250,flex:'0 0 250px'}}>
                {avatarUrl&&<div aria-label='Selected player avatar preview' style={{position:'absolute',left:59.75,top:49.25,width:130.25,height:132.75,backgroundImage:`url(${avatarUrl})`,backgroundSize:'cover',backgroundPosition:'center',borderRadius:8,zIndex:2}}/>}
                <input ref={inputRef} type='file' accept='image/*' onChange={setAvatar} style={{display:'none'}}/>
                <Image src={leftPanelPicture} alt='Player picture frame' priority width={250} height={250} className='h-[250px] w-[250px] object-contain' sizes='250px' style={{position:'absolute',left:0,top:0,zIndex:3,pointerEvents:'none'}}/>
              </div>

              <Image src={leftPanelPosition} alt='Player current position frame' priority width={250} height={75} className='h-[75px] w-[250px] object-contain' sizes='250px'/>

              <div style={{position:'relative',width:250,height:313,flex:'0 0 313px'}}>
                <Image src={leftPanelTressury} alt='Player treasury frame' width={250} height={313} className='h-[313px] w-[250px] object-contain' sizes='250px'/>
                <Image src={leftPanelMercoria} alt='Mercoria points' width={51} height={51} sizes='51px' style={{position:'absolute',left:32,top:55.5,width:51,height:51,objectFit:'contain',zIndex:2}}/>
                <Image src={leftPanelGold} alt='Gold' width={54} height={54} sizes='54px' style={{position:'absolute',left:35.75,top:125,width:45,height:54,objectFit:'contain',zIndex:2}}/>
                <Image src={leftPanelMoney} alt='Money' width={58} height={58} sizes='58px' style={{position:'absolute',left:37,top:196,width:40,height:58,objectFit:'contain',zIndex:2}}/>
              </div>
            </div>
          </aside>

          <aside aria-label='middle panel' style={middlePanel}>
            <div className='p-4'>
              <button type='button' onClick={pickAvatar} className='border border-black/20 bg-white px-4 py-2 text-sm font-medium text-[#1b1d21] shadow-[0_8px_24px_rgba(15,23,42,.08)] transition hover:bg-[#f3f4f6]'>
                Качи профилна снимка
              </button>
            </div>
          </aside>

          <aside aria-label='right panel' style={rightPanel}/>
        </section>
      </div>
    </main>
  );
}

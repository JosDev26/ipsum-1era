'use client'

import style from './page.module.css'
import Image from 'next/image';
import { TagPicker } from 'rsuite';
import 'rsuite/dist/rsuite-no-reset.min.css';
import NavBar from '../components/navbar/Navbar';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation'

function Search() {
    const searchParams = useSearchParams()
    const user = searchParams.get('user')
   
    return <NavBar logo={false} searchBar={false} user={user}/>
  }


export default function Home() {


    const data = ['Bono: Articulo 59', 'Bono: CLP', 'Entidad: Mutual', 'Entidad: Mucap'].map(
        item => ({ label: item, value: item })
    );


    return(
        <>
        <Suspense>
            <Search></Search>
        </Suspense>
        

        
        <main className={style.main}>
           
            
           <Image src={'/logo.svg'} width={90} height={40} className={style.logo} priority={true} alt='logo'/>
            

            <form action="/api/search" method='POST' className={style.searchBar}>
                <TagPicker data={data} name='tags' className={style.inputText} placeholder='Buscar...'/>    
                
                <button type="submit" style={{background: "none", border: "none"}}>
                    <Image src={'/lupa.svg'} width={20} height={20}  className={style.lupa} alt='lupa'/>
                </button>
            </form>
            
        </main>
        </>
        
    );
    
}
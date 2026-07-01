import "./globals.css";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata = {

title:"TransformHer",

description:"Every Page Changes A Life"

};

export default function RootLayout({

children,

}:{

children:React.ReactNode

}){

return(

<html lang="en">

<body>

<Navbar/>

{children}

<Footer/>

</body>

</html>

)

}
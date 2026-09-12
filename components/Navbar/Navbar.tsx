import { useState, useRef } from "react";
import NavbarActionItem from "./NavbarActionItem";
import NavbarBadge from "./NavbarBadge";
import NavbarIconItem from "./NavbarIconItem";
import NavbarItem from "./NavbarItem";
import NavbarMobileIcon from "./NavbarMobileIcon";
import Image from "next/image";

import WatoLogo from "../../public/imgs/watonomous.png";
import NavbarFolder from "./NavbarFolder";

import { Car, Zap, Orbit, Bot, BookOpen, CloudLightning, ChevronDown } from "lucide-react";
interface NavBarProps {
    toggleModal(): any;
    dark?: boolean;
}

const Navbar = ({ toggleModal, dark }: NavBarProps) => {
    const [mobileOpen, setMobileOpen] = useState(false);

    const listRef = useRef<HTMLUListElement>(null);
    const closeMobile = () => {
        setMobileOpen(false);
        setTimeout(() => {
            if (listRef.current) listRef.current.scrollTop = 0;    
        }, 80);   
    }
    const toggleMobile = () => {
        if(mobileOpen) {
            closeMobile();
        } else {
            setMobileOpen(true);
        }
    };

    return (
        <div className="flex w-screen justify-center">
            <div className="pointer-events-none fixed z-30 h-screen w-screen bg-TopGradient" />
            <div className="align-center pointer-events-none fixed z-40 flex w-screen justify-between max-lg:px-2 lg:mt-10 lg:w-[90vw] xl:max-w-[100rem]">
            <div className={`pointer-events-none absolute left-0 top-0 z-30 h-16 w-full bg-wato-black-vanta transition-opacity duration-500 lg:hidden ${mobileOpen ? "opacity-100" : "opacity-0"}`} />
                <NavbarBadge href={"/"}>
                    <Image src={WatoLogo} alt={"WATonomous logo"} width={150} />
                </NavbarBadge>
                <div className={`flex flex-row`}>
                    <NavbarMobileIcon
                        active={mobileOpen}
                        onclick={toggleMobile}
                        dark={dark}
                    />
                    <ul
                        className={` list-none max-lg:absolute max-lg:left-0 max-lg:z-20 max-lg:flex max-lg:w-full max-lg:flex-col max-lg:pt-16 ${
                            mobileOpen
                                ? "max-lg:h-[100vh] max-lg:bg-wato-black-vanta"
                                : "max-lg:h-0"
                        } pointer-events-auto flex transition-all duration-500 max-lg:overflow-y-auto`}
                        ref={listRef}
                    >
                        <NavbarItem href={"/about"} toggle={closeMobile}>
                            ABOUT
                        </NavbarItem>
                        <NavbarFolder
                            title={
                                <div className="flex items-center">
                                    PROJECTS
                                    <ChevronDown className="ml-1 -mr-1.5 max-lg:hidden transition-transform duration-200 group-hover:rotate-180" size={14} />
                                </div>
                            }
                        >
                            <NavbarItem
                                href={"/projects/eve"}
                                toggle={closeMobile}
                            >
                                <div className="flex items-center gap-1">
                                    <Car size={16} />
                                    <span className="lg:hidden">PROJECTS - </span>EVE
                                </div>
                            </NavbarItem>
                            <NavbarItem
                                href={"/projects/humanoid"}
                                toggle={closeMobile}
                            >
                                <div className="flex items-center gap-1">
                                    <Bot size={16} />
                                    <span className="lg:hidden">PROJECTS - </span>HUMANOID
                                </div>
                            </NavbarItem>
                            <NavbarItem
                                href={"/projects/micro"}
                                toggle={closeMobile}
                            >
                                <div className="flex items-center gap-1">
                                    <Zap size={16} />
                                    <span className="lg:hidden">PROJECTS - </span>MICRO
                                </div>
                            </NavbarItem>
                            <NavbarItem
                                href={"/projects/rover"}
                                toggle={closeMobile}
                            >
                                <div className="flex items-center gap-1">
                                    <Orbit size={16} />
                                    <span className="lg:hidden">PROJECTS - </span>ROVER
                                </div>
                            </NavbarItem>
                        </NavbarFolder>
                        {/* <NavbarItem href={"/blogs"} toggle={closeMobile}>
                        BLOG
                    </NavbarItem> */}
                        <NavbarItem href={"/careers"} toggle={closeMobile}>
                            JOIN US
                        </NavbarItem>
                        <NavbarItem href={"/sponsor"} toggle={closeMobile}>
                            SPONSORS
                        </NavbarItem>
                        <NavbarFolder
                            title={
                                <div className="flex items-center">
                                    EXTERNAL
                                    <ChevronDown className="ml-1 -mr-1.5 max-lg:hidden transition-transform duration-200 group-hover:rotate-180" size={14} />
                                </div>
                            }
                        >
                            <NavbarItem
                                href={"https://wiki.watonomous.ca/"}
                                toggle={closeMobile}
                                newTab
                            >
                                <div className="flex items-center gap-1">
                                    <BookOpen size={16} />
                                    <span className="lg:hidden">EXTERNAL - </span>WIKI
                                </div>
                            </NavbarItem>
                            <NavbarItem
                                href={"https://cloud.watonomous.ca/"}
                                toggle={closeMobile}
                                newTab
                            >
                                <div className="flex items-center gap-1">
                                    <CloudLightning size={16} />
                                    <span className="lg:hidden">EXTERNAL - </span>WATcloud
                                </div>
                            </NavbarItem>
                            <NavbarItem
                                href={"https://watonomous.github.io/humanoid-docs/index.html"}
                                toggle={closeMobile}
                                newTab
                            >
                                <div className="flex items-center gap-1">
                                    <Bot size={20} />
                                    <span className="lg:hidden">EXTERNAL - </span>Humanoid Docs
                                </div>
                            </NavbarItem>
                        </NavbarFolder>
                        <NavbarIconItem
                            href={"https://www.instagram.com/watonomous"}
                            icon={"fa-instagram"}
                            label="Instagram"
                        />
                        <NavbarIconItem
                            href={
                                "https://www.linkedin.com/company/watonomous/"
                            }
                            icon={"fa-linkedin"}
                            label="LinkedIn"
                        />
                        <NavbarIconItem
                            href={"https://www.youtube.com/@WATonomous/videos"}
                            icon={"fa-youtube"}
                            label="YouTube"
                        />
                        <NavbarIconItem
                            href={"https://github.com/WATonomous"}
                            icon={"fa-github"}
                            label="GitHub"
                        />
                        <NavbarActionItem actions={[toggleModal, closeMobile]}>
                            CONNECT
                        </NavbarActionItem>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default Navbar;

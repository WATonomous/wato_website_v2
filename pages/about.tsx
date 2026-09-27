import Hero from "../components/Hero";
import VerticalTabs from "../components/VerticalTabs/VerticalTabs";
import img01 from "../public/imgs/jobpostings-hero.jpg";
import Image from "next/image";
import MemberList from "../components/VerticalTabs/MemberList";
import VerticalCards from "../components/VerticalCards/VerticalCards";
import Timeline from "../components/VerticalTabs/Timeline";

import lena from "../public/imgs/headshots/pfp2 - Lena Ye.jpg";
import jivan from "../public/imgs/headshots/headshot - Jivan Kesan.jpeg";
import muhtasim from "../public/imgs/headshots/Muhtasim-headshot.jpg";
import harsharan from "../public/imgs/headshots/20241114_192744 - Harsharan Rakhra.jpg";
import manjot from "../public/imgs/headshots/IMG_3159 - Manjot Dola.jpg";
import andrew from "../public/imgs/headshots/Andrew Headshot - Andrew Shen.jpg";
import jessica from "../public/imgs/headshots/IMG_4521 - jessica yuan.jpg";
import rodney from "../public/imgs/headshots/IMG_0822 - Rodney Dong.jpeg";
import neha from "../public/imgs/headshots/WhatsApp Image 2024-07-15 at 6.50.47 PM - Neha Kasoju.jpeg";
import isaac from "../public/imgs/headshots/HeadShot - Isaac Yu.png";
import sophie from "../public/imgs/headshots/IMG_4188 - Sophie Xie.jpg";
import owen from "../public/imgs/headshots/IMG_6799 - Owen Leather.jpeg";
import krish from "../public/imgs/headshots/krish-xlerate-headshot - Krish Chopra.png";
import rajan from "../public/imgs/headshots/headshot - Rajan Agarwal.png";
import kai from "../public/imgs/headshots/pfp - Kai Ma.png";
import lucas from "../public/imgs/headshots/_MG_0311_Original - lucas reljic-dumont.jpeg";
import brian from "../public/imgs/headshots/Brian_Zheng-headshot.jpeg";
import luc from "../public/imgs/headshots/IMG_8487 - Luc Edes - headshot.jpg";
import kishore from "../public/imgs/headshots/1680722752326 - Kishore Yogaraj.jpg";
import mark from "../public/imgs/headshots/IMG_7633_-_Mark_Chiu.jpg";
import jadiha from "../public/imgs/headshots/Headshot - Jadiha Aruleswaran.jpg";
import ken from "../public/imgs/headshots/headshot ken jiang.png";
import wilson from "../public/imgs/headshots/Wilson_Cheng - Wilson Cheng.jpeg";
import neil from "../public/imgs/headshots/Neil_Ma - Neil Ma.jpeg";
import muhammad from "../public/imgs/headshots/Muhammad_Farooqi - Muhammad Farooqi.jpeg";
import allen from "../public/imgs/headshots/Allen_Abraham - Allen Abraham.jpeg";
import VerticalCards2 from "../components/VerticalCards/VerticalCards2";

const HERO_TEXT =
    "WATonomous is an agile team of future developers, engineers, and visionaries looking to become leaders in Robotics and Artificial Intelligence.";

const IMAGE_PLACEHOLDER = (
    <Image alt="test" src={img01} className="rounded-sm object-cover" />
);

const MemberData = [
    {
        imageSrc: brian,
        firstName: "Brian",
        lastName: "Zheng",
        description: "",
        position: "Co-Captain",
    },
    {
        imageSrc: wilson,
        firstName: "Wilson",
        lastName: "Cheng",
        description: "",
        position: "Humanoid Director",
    },
    {
        imageSrc: lucas,
        firstName: "Lucas",
        lastName: "Reljic-Dumont",
        description: "",
        position: "Autonomous Vehicle Director",
    },
    {
        imageSrc: muhtasim,
        firstName: "Muhtasim",
        lastName: "Ahsan",
        description: "",
        position: "Micro Autonomy Director",
    },
    {
        imageSrc: neil,
        firstName: "Neil",
        lastName: "Ma",
        description: "",
        position: "Humanoid Mechanical Lead",
    },
    {
        imageSrc: muhammad,
        firstName: "Muhammad",
        lastName: "Farooqi",
        description: "",
        position: "Humanoid Software Lead",
    },
    {
        imageSrc: allen,
        firstName: "Allen",
        lastName: "Abraham",
        description: "",
        position: "Humanoid Perception Lead",
    },
    {
        imageSrc: kishore,
        firstName: "Kishore",
        lastName: "Yogaraj",
        description: "",
        position: "Perceptions Lead",
    },
    {
        imageSrc: rodney,
        firstName: "Rodney",
        lastName: "Dong",
        description: "",
        position: "Micro Autonomy Lead",
    },
    {
        imageSrc: ken,
        firstName: "Ken",
        lastName: "Jiang",
        description: "",
        position: "BizOps Lead",
    },
    {
        imageSrc: jadiha,
        firstName: "Jadiha",
        lastName: "Aruleswaran",
        description: "",
        position: "BizOps Lead",
    },
    {
        imageSrc: lena,
        firstName: "Lena",
        lastName: "Ye",
        description:
            "Stumbled into Software by accident. Now serving as living proof of why you should join WATO.",
        position: "BizOps",
    },
    {
        imageSrc: jivan,
        firstName: "Jivan",
        lastName: "Kesan",
        description: "",
        position: "World Modelling",
    },
    {
        imageSrc: harsharan,
        firstName: "Harsharan",
        lastName: "Rakhra",
        description: "",
        position: "Micro Autonomy",
    },
    {
        imageSrc: manjot,
        firstName: "Manjot",
        lastName: "Dola",
        description: "",
        position: "Micro Autonomy",
    },
    {
        imageSrc: andrew,
        firstName: "Andrew",
        lastName: "Shen",
        description: "",
        position: "ASD + World Modelling",
    },
    {
        imageSrc: jessica,
        firstName: "Jessica",
        lastName: "Yuan",
        description: "",
        position: "ASD",
    },
    {
        imageSrc: neha,
        firstName: "Neha",
        lastName: "Kasoju",
        description: "",
        position: "Vehicle Platform",
    },
    {
        imageSrc: isaac,
        firstName: "Isaac",
        lastName: "Yu",
        description: "",
        position: "ASD",
    },
    {
        imageSrc: sophie,
        firstName: "Sophie",
        lastName: "Xie",
        description: "",
        position: "World Modelling",
    },
    {
        imageSrc: owen,
        firstName: "Owen",
        lastName: "Leather",
        description: "",
        position: "Research Member",
    },
    {
        imageSrc: krish,
        firstName: "Krish",
        lastName: "Chopra",
        description: "",
        position: "Actions",
    },
    {
        imageSrc: rajan,
        firstName: "Rajan",
        lastName: "Agarwal",
        description: "",
        position: "Actions",
    },
    {
        imageSrc: kai,
        firstName: "Kai",
        lastName: "Ma",
        description: "",
        position: "Research Member",
    },
    {
        imageSrc: luc,
        firstName: "Luc",
        lastName: "Edes",
        description: "",
        position: "Research Member",
    },
    {
        imageSrc: mark,
        firstName: "Mark",
        lastName: "Chiu",
        description: "",
        position: "Research Member",
    },
];

const MEMBER_LIST = <MemberList data={MemberData} />;
const VERTICAL_CARDS = <VerticalCards />;
const TIMELINE = <Timeline />;
const VERTICAL_CARDS_2 = <VerticalCards2 />;

const TabData = [
    {
        title: "What is WATonomous?",
        body: `WATonomous has one mission: "To show the world a bunch of students can build autonomous robots." WATonomous is a diverse project-based team pursuing various forms of robotics. We are the leading software design team at the University of Waterloo, giving students the opportunity to learn and show off their industry-grade robotics expertise.`,
        children: VERTICAL_CARDS,
        last: false,
    },
    {
        title: "Multi Project Oriented",
        body: "WATonomous pursues a variety of initiatives, each with their own incentive structure and flavour of robotics software. Members of WATonomous have the freedom to switch between projects whenever they want.",
        children: VERTICAL_CARDS_2,
        last: false,
    },
    {
        title: "Our Story",
        body: "Founded in 2017, WATonomous started from a vision to build a self-driving car for the Autodrive Challenge. Following the competition, our team chose an unorthodox path to pursue autonomy on our own terms. Since then, WATonomous has diversified its projects to include all things autonomy, whether it be AVs, RC racing, follower bots, or humanoids.",
        children: TIMELINE,
        last: false,
    },
    {
        title: "Built By Many",
        body: "WATonomous is dedicated to fostering a close-knit community of robotics enthusiasts. Every member brings a unique strength to WATonomous, collaborating to push the boundaries of autonomous technology and make a lasting impact.",
        children: MEMBER_LIST,
        last: false,
    },
    {
        title: "Into the Fire",
        body: "Now that you've gotten to know what WATonomous is all about, it's time to dive deeper. Explore our latest projects, meet the team behind the technology, or see how you can get involved. Step into the heart of our journey and discover what drives us forward.",
        children: IMAGE_PLACEHOLDER,
        last: true,
    },
];

const About = () => {
    return (
        <div>
            <Hero
                title="Driving Tomorrow, Today"
                subtitle={HERO_TEXT}
                cta="Dive In"
                link="#tabs"
                fixed
                // image="bg-VideoPlaceholder"
            />
            <VerticalTabs data={TabData} />
        </div>
    );
};

export default About;

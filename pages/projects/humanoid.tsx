import Head from "next/head";
import Image from "next/image";
import ContentPane from "../../components/ContentPane";
import Hero from "../../components/Hero";
import CTASection from "../../components/CTASection";
import MemberCard, { MemberCardProps } from "../../components/MemberCard";
import { SponsorCardProps } from "../../components/Sponsor/SponsorCard";

import wilson from "../../public/imgs/headshots/Wilson_Cheng - Wilson Cheng.jpeg";
import allen from "../../public/imgs/headshots/Allen_Abraham - Allen Abraham.jpeg";

import heroImg from "../../public/imgs/projects/humanoid/humanoid_hero.jpg";
import imgpane01 from "../../public/imgs/projects/humanoid/dual_arm_hero.png";
import imgpane02 from "../../public/imgs/projects/humanoid/leg_cad.png";
import imgpane03 from "../../public/imgs/projects/humanoid/hand_22dof.jpg";
import imgpane04 from "../../public/imgs/projects/humanoid/dual_arm_bench.jpg";
import imgpane05 from "../../public/imgs/projects/humanoid/hand_22dof_2.jpg";
import imgpane06 from "../../public/imgs/projects/humanoid/leg_cad_2.png";
import imgpane07 from "../../public/imgs/projects/humanoid/leg_cad_3.png";
import imgpane08 from "../../public/imgs/projects/humanoid/leg_cad_4.png";
import handImg03 from "../../public/imgs/projects/humanoid/hand_22dof_3.jpg";
import handImg04 from "../../public/imgs/projects/humanoid/hand_22dof_4.jpg";

import fabworks from "../../public/imgs/sponsors/fabworks.png";
import cubemars from "../../public/imgs/sponsors/cubemars.png";

const PAGE_TITLE = "Humanoid Autonomy";
const HERO_TEXT = "Building UWaterloo's first humanoid robot, Pioneer: a 14 DOF bimanual arm, 22 DOF hand, and 12 DOF leg, fully custom and built in-house from mechanical design to autonomy stack, bringing human-like mobility and dexterity to real-world environments.";
const DOCS_LINK = "https://watonomous.github.io/humanoid-docs/index.html";

const PROGRESS_TITLE = "Progress in Motion";
const PROGRESS_SUBTITLE = "Build Highlights, Straight from the Lab";
const PROGRESS_CONTENT = `A look at the platform coming together: hardware bring-up, actuator testing, and the humanoid taking shape one iteration at a time.`;

const PANE1_TITLE = "Toward End-to-End Autonomy";
const PANE1_SUBTITLE = "Isaac Lab Simulation, Real-World Demonstrations";
const PANE1_CONTENT = `Pioneer's autonomy stack combines two complementary approaches: reinforcement learning trains low-level skills like balance and manipulation entirely in NVIDIA Isaac Lab, while imitation learning trains directly on real-world demonstration data collected from the physical robot. Closing the sim-to-real gap between the two is central to our approach, letting us iterate on behavior fast in simulation while grounding it in how the robot actually moves.`;

const PANE3_TITLE = "22 DOF Hand";
const PANE3_SUBTITLE = "Dexterous Manipulation Hardware";
const PANE3_CONTENT = `Our in-house hand packs 22 degrees of freedom, 16 actuated, into a human-sized form factor. It's the manipulation endpoint for both teleoperation and learned control: precise enough for fine motor tasks, durable enough for daily testing and iteration.`;

const PANE6_TITLE = "Bipedal Locomotion";
const PANE6_SUBTITLE = "Custom Leg, Built from Scratch";
const PANE6_CONTENT = `Every joint is designed and built in-house. Each 6 DOF leg uses a Flexion-Abduction-Rotation hip configuration for compact, biomimetic packaging, paired with custom motor selection per joint, modeled, analyzed, and refined in CAD before a single part is machined. This tight CAD-to-hardware loop lets us tailor hardware to software needs and validate range of motion and structural margins before committing to the physical build.`;

const PANE4_TITLE = "Learning to Manipulate";
const PANE4_SUBTITLE = "From Demonstrations to Policies";
const PANE4_CONTENT = `We collect human demonstrations using a Quest headset over VR teleoperation: wrist and hand-tracking data streams over WebXR to a ROS 2 bridge, driving a per-arm differential IK controller in Isaac Sim (and on hardware, gated behind an e-stop). Those demonstrations feed imitation learning, and we're building toward end-to-end pixel-to-action control by pairing them with VLA fine-tuning and distillation into deployable policies.`;

const RL_VIDEO_TITLE = "In-Hand Manipulation, Learned with RL";
const RL_VIDEO_SUBTITLE = "PPO Policy, Cube Reorientation Task";
const RL_VIDEO_CONTENT = `Our Isaac Lab policy learns to reorient a cube toward commanded goal poses using only the 16 actuated joints of the hand, no external fixturing or resets between attempts.`;

const TEAM_TITLE = "F26 Term Members";
const TEAM_MEMBERS: MemberCardProps[] = [
  {
    imageSrc: wilson,
    firstName: "Wilson",
    lastName: "Cheng",
    description: "",
    position: "Humanoid Director",
  },
  {
    imageSrc: allen,
    firstName: "Allen",
    lastName: "Abraham",
    description: "",
    position: "Humanoid Perception Lead",
  },
];

const SPONSORS_TITLE = "Our Sponsors";
const SPONSORS_SUBTITLE = "The Partners Helping Build Pioneer";
const SPONSORS: SponsorCardProps[] = [
  {
    title: "Fabworks",
    image: fabworks,
    url: "https://www.fabworks.com/",
  },
  {
    title: "CubeMars",
    image: cubemars,
    url: "https://www.cubemars.com/",
  },
];

const Humanoid = () => {
  return (
    <>
      <Head>
        <title>UWaterloo's First Humanoid Robot - Pioneer | WATonomous</title>
        <meta
          name="description"
          content="Pioneer is UWaterloo's first humanoid robot, built by WATonomous - 22 DOF hand, bimanual arm, and 12 DOF legs."
        />
      </Head>
      <Hero
        image={heroImg}
        title={PAGE_TITLE}
        subtitle={HERO_TEXT}
        cta={"See More"}
        link={"#info"}
        secondaryCta={"Visit Our Documentation ↗"}
        secondaryLink={DOCS_LINK}
        fixed
      />
      <div id="info">
        <div className="relative flex flex-col items-center bg-black bg-opacity-90 py-32 lg:bg-opacity-80">
          <div className="relative z-10 flex w-full max-w-[95rem] flex-col items-center px-8 text-center text-white md:px-16 lg:w-[85vw] lg:px-0">
            <div className="text-3xl font-black lg:text-4xl">
              {PROGRESS_TITLE}&nbsp;<span className="text-wato-teal">{"//"}</span>
            </div>
            <div className="mb-6 mt-2 text-base italic text-wato-teal lg:text-lg">
              {PROGRESS_SUBTITLE}
            </div>
            <p className="mb-8 max-w-3xl text-sm lg:text-base">{PROGRESS_CONTENT}</p>
            <video
              controls
              playsInline
              className="w-full max-w-4xl rounded-md"
            >
              <source src="/imgs/projects/humanoid/humanoid_progress.mp4" type="video/mp4" />
            </video>
          </div>
        </div>

        <ContentPane
          title={PANE1_TITLE}
          subtitle={PANE1_SUBTITLE}
          img={imgpane01}
          leftOriented={true}
        >
          {PANE1_CONTENT}
        </ContentPane>
      </div>

      <div className="relative flex flex-col items-center bg-black bg-opacity-90 py-32 lg:bg-opacity-80">
        <div className="relative z-10 flex w-full max-w-[95rem] flex-col gap-x-16 px-8 md:px-16 lg:w-[85vw] lg:flex-row lg:px-0">
          <div className="flex flex-col justify-center text-white max-lg:items-center lg:w-[51%]">
            <div className="text-3xl font-black max-lg:text-center lg:text-4xl">
              {PANE3_TITLE}&nbsp;<span className="text-wato-teal">{"//"}</span>
            </div>
            <div className="text-base italic text-wato-teal max-lg:text-center lg:mb-6 lg:mt-2 lg:text-lg">
              {PANE3_SUBTITLE}
            </div>
            <div className="max-lg:py-8 max-lg:text-sm">{PANE3_CONTENT}</div>
          </div>
          <div className="grid w-4/5 grid-cols-2 gap-4 self-center lg:w-[45%]">
            <Image alt="22 DOF hand, dorsal view with thumb extended" src={handImg03} className="rounded-md" />
            <Image alt="22 DOF hand, dorsal view with fingers spread" src={handImg04} className="rounded-md" />
            <Image alt="22 DOF hand, palm view with gripper joint detail" src={imgpane03} className="rounded-md" />
            <Image alt="22 DOF hand, dorsal view resting on test rig" src={imgpane05} className="rounded-md" />
          </div>
        </div>
      </div>

      <div className="relative flex flex-col items-center bg-black bg-opacity-90 py-32 lg:bg-opacity-80">
        <div className="relative z-10 flex w-full max-w-[95rem] flex-col gap-x-16 px-8 md:px-16 lg:w-[85vw] lg:flex-row-reverse lg:px-0">
          <div className="flex flex-col justify-center text-white max-lg:items-center lg:w-[51%]">
            <div className="text-3xl font-black max-lg:text-center lg:text-4xl">
              {PANE6_TITLE}&nbsp;<span className="text-wato-teal">{"//"}</span>
            </div>
            <div className="text-base italic text-wato-teal max-lg:text-center lg:mb-6 lg:mt-2 lg:text-lg">
              {PANE6_SUBTITLE}
            </div>
            <div className="max-lg:py-8 max-lg:text-sm">{PANE6_CONTENT}</div>
          </div>
          <div className="grid w-4/5 grid-cols-2 gap-4 self-center lg:w-[45%]">
            <Image alt="Humanoid leg CAD render, silver finish" src={imgpane02} className="rounded-md" />
            <Image alt="Humanoid leg CAD render, black finish" src={imgpane06} className="rounded-md" />
            <Image alt="Humanoid leg CAD render, wireframe view" src={imgpane07} className="rounded-md" />
            <Image alt="Humanoid leg CAD render, line art view" src={imgpane08} className="rounded-md" />
          </div>
        </div>
      </div>

      <ContentPane
        title={PANE4_TITLE}
        subtitle={PANE4_SUBTITLE}
        img={imgpane04}
        leftOriented={false}
      >
        {PANE4_CONTENT}
      </ContentPane>

      <div className="relative flex flex-col items-center bg-black bg-opacity-90 py-32 lg:bg-opacity-80">
        <div className="relative z-10 flex w-full max-w-[95rem] flex-col items-center px-8 text-center text-white md:px-16 lg:w-[85vw] lg:px-0">
          <div className="text-3xl font-black lg:text-4xl">
            {RL_VIDEO_TITLE}&nbsp;<span className="text-wato-teal">{"//"}</span>
          </div>
          <div className="mb-6 mt-2 text-base italic text-wato-teal lg:text-lg">
            {RL_VIDEO_SUBTITLE}
          </div>
          <p className="mb-8 max-w-3xl text-sm lg:text-base">{RL_VIDEO_CONTENT}</p>
          <video autoPlay playsInline muted loop className="w-full max-w-4xl rounded-md">
            <source src="/imgs/projects/humanoid/inhand_rl.mp4" type="video/mp4" />
          </video>
        </div>
      </div>

      <div className="relative flex flex-col items-center bg-black bg-opacity-90 py-32 lg:bg-opacity-80">
        <div className="relative z-10 flex w-full max-w-[95rem] flex-col items-center px-8 text-center text-white md:px-16 lg:w-[85vw] lg:px-0">
          <div className="mb-8 text-3xl font-black lg:text-4xl">
            {TEAM_TITLE}&nbsp;<span className="text-wato-teal">{"//"}</span>
          </div>
          <div className="grid w-full max-w-md grid-cols-2 gap-4">
            {TEAM_MEMBERS.map((member, id) => (
              <MemberCard
                key={id}
                imageSrc={member.imageSrc}
                firstName={member.firstName}
                lastName={member.lastName}
                description={member.description}
                position={member.position}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="relative flex flex-col items-center bg-black bg-opacity-90 py-32 lg:bg-opacity-80">
        <div className="relative z-10 flex w-full max-w-[95rem] flex-col items-center px-8 text-center text-white md:px-16 lg:w-[85vw] lg:px-0">
          <div className="text-3xl font-black lg:text-4xl">
            {SPONSORS_TITLE}&nbsp;<span className="text-wato-teal">{"//"}</span>
          </div>
          <div className="mb-8 mt-2 text-base italic text-wato-teal lg:text-lg">
            {SPONSORS_SUBTITLE}
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {SPONSORS.map((sponsor) => (
              <a
                key={sponsor.title}
                href={sponsor.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={sponsor.title}
                className="flex h-32 w-56 items-center justify-center rounded-lg border border-wato-teal/20 bg-[#161c24] p-5 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_24px_rgba(102,221,200,0.35)]"
              >
                <Image
                  src={sponsor.image}
                  alt={`${sponsor.title} sponsor logo`}
                  className="max-h-full max-w-full object-contain"
                />
              </a>
            ))}
          </div>
        </div>
      </div>

      <CTASection
        title="Interested in joining?"
        description="Help build the future of humanoid robotics"
        ctaText="Apply Here"
        ctaLink="/careers"
      />
    </>
  );
};

export default Humanoid;

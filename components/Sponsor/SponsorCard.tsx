import Image, { StaticImageData } from "next/image";

export interface SponsorCardProps {
    title: string;
    image: StaticImageData;
    url?: string;
}

const SponsorCard = ({ title, image }: SponsorCardProps) => {
    return (
        <div className="group relative m-4 flex flex-col items-center rounded-md bg-wato-grey px-8 py-4 duration-200 hover:shadow-NoOffset hover:shadow-wato-teal">
            <div className="flex h-24 items-center justify-center transition-all duration-200 group-hover:opacity-0">
                <Image src={image} alt={`${title} sponsor logo`} width={150} />
            </div>
            <h2 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xl font-bold text-wato-black-vanta opacity-0 transition-all duration-200 group-hover:opacity-100">
                {title}
            </h2>
        </div>
    );
};

export default SponsorCard;

import { JobPostingFrontmatter, JobPostingFrontmatterList } from "../types";

import AccordionContainer from "./AccordionContainer";
import Card from "./Card";

interface JobPostingListProps {
    data: JobPostingFrontmatterList;
}
interface AccordionItem {
    title: string;
    elements: React.JSX.Element[];
}

const JobPostingList = ({ data }: JobPostingListProps) => {
    const accordionData: AccordionItem[] = [];

    for (const team in data) {
        accordionData.push({
            title: team,
            elements: data[team].map((posting: JobPostingFrontmatter) => {
                return (
                    <Card
                        key={posting.title}
                        title={posting.title}
                        subtitle={`${posting.team} - ${posting.subteam}`}
                        body={[posting.location, posting.type]}
                        cta={"Apply"}
                        buttonLink={`/careers/${posting.id}`}
                    />
                );
            }),
        });
    }

    return (
        <div
            id={"open-roles"}
            className={`flex flex-col relative items-center bg-neutral-800 py-32`}
        >
            <div className="mx-auto w-full max-w-[95rem] px-8 md:px-16 lg:w-[85vw] lg:px-0">
            <div className="pb-16 text-center text-4xl font-bold text-white">
                Open Roles
            </div>
            <AccordionContainer data={accordionData} />
            <div className="mt-10 rounded-md border border-wato-teal bg-wato-grey-clear px-6 py-5 text-center text-white">
                <h2 className="text-xl font-bold">
                    Interested in Website, Sales, or Graphic Design?
                </h2>
                <p className="mt-2 text-base">
                    Reach out directly and tell us how you would like to contribute.
                </p>
                <a
                    href="mailto:hello@watonomous.ca"
                    className="mt-4 inline-block font-medium text-wato-teal hover:text-white"
                >
                    hello@watonomous.ca
                </a>
            </div>
            </div>
        </div>
    );
};

export default JobPostingList;

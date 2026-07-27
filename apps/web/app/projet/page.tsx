import Projet from "@/components/Projet";

export const dynamic = "force-dynamic";

export default function ProjetPage({
  searchParams,
}: {
  searchParams: { type?: string; id?: string };
}) {
  const type = searchParams.type === "investment" ? "investment" : "home";
  return <Projet type={type} initialId={searchParams.id} />;
}

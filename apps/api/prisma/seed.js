import { PrismaClient } from "../generated/prisma/client.js";
const prisma = new PrismaClient();
const baseRows = [
    {
        code: "OBR-2026-000001",
        title: "Obra Residencial - Vila Aurora",
        constructionType: "RESIDENTIAL",
        constructionStage: "FOUNDATION",
        commercialPotential: "MEDIUM",
        status: "CAPTURED",
        addressSource: "MANUAL",
        street: "Rua das Acacias",
        number: "120",
        district: "Vila Aurora",
        city: "Curitiba",
        state: "PR",
        notes: "Condominio residencial com 3 torres.",
        tags: JSON.stringify(["residencial", "fundacao"]),
    },
    {
        code: "OBR-2026-000002",
        title: "Centro Comercial Alpha",
        constructionType: "COMMERCIAL",
        constructionStage: "STRUCTURE",
        commercialPotential: "HIGH",
        status: "CAPTURED",
        addressSource: "GPS",
        city: "Curitiba",
        district: "Centro",
        state: "PR",
        latitude: -25.429,
        longitude: -49.271,
        locationAccuracy: 12,
        notes: "Estrutura metalica em andamento.",
        tags: JSON.stringify(["comercial", "estrutura"]),
    },
    {
        code: "OBR-2026-000003",
        title: "Planta Industrial Horizonte",
        constructionType: "INDUSTRIAL",
        constructionStage: "INSTALLATIONS",
        commercialPotential: "HIGH",
        status: "UNDER_REVIEW",
        addressSource: "MANUAL",
        city: "Araucaria",
        district: "Distrito Industrial",
        state: "PR",
        notes: "Instalacoes eletricas e automacao.",
        tags: JSON.stringify(["industrial", "instalacoes"]),
    },
    {
        code: "OBR-2026-000004",
        title: "Reforma Loja Bairro Alto",
        constructionType: "RENOVATION",
        constructionStage: "FINISHING",
        commercialPotential: "LOW",
        status: "CAPTURED",
        addressSource: "MANUAL",
        city: "Curitiba",
        district: "Bairro Alto",
        state: "PR",
        notes: "Reforma interna sem coordenadas disponiveis.",
        tags: JSON.stringify(["reforma"]),
    },
    {
        code: "OBR-2026-000005",
        title: "Obra Capturada via GPS",
        constructionType: "UNKNOWN",
        constructionStage: "SITE_PREPARATION",
        commercialPotential: "NOT_EVALUATED",
        status: "DRAFT",
        addressSource: "GPS",
        latitude: -25.438,
        longitude: -49.273,
        locationAccuracy: 20,
        notes: "Registro inicial com localizacao automatica.",
        tags: JSON.stringify(["gps"]),
    },
];
async function main() {
    for (const row of baseRows) {
        await prisma.constructionOpportunity.upsert({
            where: { code: row.code },
            update: {
                ...row,
                status: row.status,
                constructionType: row.constructionType,
                constructionStage: row.constructionStage,
                commercialPotential: row.commercialPotential,
                addressSource: row.addressSource,
            },
            create: {
                ...row,
                status: row.status,
                constructionType: row.constructionType,
                constructionStage: row.constructionStage,
                commercialPotential: row.commercialPotential,
                addressSource: row.addressSource,
            },
        });
    }
}
main()
    .then(async () => {
    await prisma.$disconnect();
})
    .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
});

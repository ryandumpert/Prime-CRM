import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Initialize Prisma (reads DATABASE_URL from environment by default)
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...\n');

    // Create Admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@primeloanadvisors.com' },
        update: {},
        create: {
            email: 'admin@primeloanadvisors.com',
            password: adminPassword,
            displayName: 'Admin User',
            role: 'admin',
            active: true,
        },
    });
    console.log('✅ Created admin user:', admin.email);

    // Create 4 Advisors (per blueprint.md)
    const advisorPassword = await bcrypt.hash('advisor123', 10);

    const advisors = [
        { email: 'john.smith@primeloanadvisors.com', displayName: 'John Smith' },
        { email: 'sarah.johnson@primeloanadvisors.com', displayName: 'Sarah Johnson' },
        { email: 'michael.chen@primeloanadvisors.com', displayName: 'Michael Chen' },
        { email: 'emily.davis@primeloanadvisors.com', displayName: 'Emily Davis' },
    ];

    for (const advisor of advisors) {
        const user = await prisma.user.upsert({
            where: { email: advisor.email },
            update: {},
            create: {
                email: advisor.email,
                password: advisorPassword,
                displayName: advisor.displayName,
                role: 'advisor',
                active: true,
            },
        });
        console.log('✅ Created advisor:', user.email);
    }

    // Create some sample leads for demonstration
    const johnSmith = await prisma.user.findUnique({
        where: { email: 'john.smith@primeloanadvisors.com' },
    });

    const sarahJohnson = await prisma.user.findUnique({
        where: { email: 'sarah.johnson@primeloanadvisors.com' },
    });

    if (johnSmith && sarahJohnson) {
        const sampleLeads = [
            {
                firstName: 'Robert',
                lastName: 'Williams',
                fullName: 'Robert Williams',
                phonePrimary: '+15551234567',
                emailPrimary: 'robert.williams@example.com',
                status: 'NEW' as const,
                priority: 'high' as const,
                assignedAdvisorUserId: johnSmith.id,
            },
            {
                firstName: 'Jennifer',
                lastName: 'Brown',
                fullName: 'Jennifer Brown',
                phonePrimary: '+15559876543',
                emailPrimary: 'jennifer.brown@example.com',
                status: 'CONTACTED' as const,
                priority: 'normal' as const,
                assignedAdvisorUserId: johnSmith.id,
                lastContactedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
            },
            {
                firstName: 'David',
                lastName: 'Martinez',
                fullName: 'David Martinez',
                phonePrimary: '+15555555555',
                emailPrimary: 'david.martinez@example.com',
                status: 'PREQUAL_IN_PROGRESS' as const,
                priority: 'high' as const,
                assignedAdvisorUserId: sarahJohnson.id,
                lastContactedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago (needs follow-up)
            },
            {
                firstName: 'Lisa',
                lastName: 'Anderson',
                fullName: 'Lisa Anderson',
                phonePrimary: '+15551112222',
                emailPrimary: 'lisa.anderson@example.com',
                status: 'NEW' as const,
                priority: 'normal' as const,
                assignedAdvisorUserId: sarahJohnson.id,
            },
            {
                firstName: 'James',
                lastName: 'Taylor',
                fullName: 'James Taylor',
                phonePrimary: '+15553334444',
                emailPrimary: 'james.taylor@example.com',
                status: 'DOCS_REQUESTED' as const,
                priority: 'normal' as const,
                assignedAdvisorUserId: johnSmith.id,
                lastContactedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago (needs follow-up)
            },
        ];

        for (const leadData of sampleLeads) {
            // Check if lead already exists by email
            const existingLead = await prisma.lead.findFirst({
                where: { emailPrimary: leadData.emailPrimary },
            });

            if (!existingLead) {
                const lead = await prisma.lead.create({
                    data: leadData,
                });
                console.log('✅ Created sample lead:', lead.fullName);
            } else {
                console.log('⏩ Skipping existing lead:', leadData.emailPrimary);
            }
        }
    }

    console.log('\n🎉 Seeding complete!\n');
    console.log('📋 Login Credentials:');
    console.log('   Admin: admin@primeloanadvisors.com / admin123');
    console.log('   Advisors: [firstname.lastname]@primeloanadvisors.com / advisor123');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

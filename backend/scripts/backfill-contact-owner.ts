import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type Options = {
  dryRun: boolean
  limit?: number
}

function parseOptions(argv: string[]): Options {
  const dryRun = argv.includes('--dry-run')
  const limitArg = argv.find((arg) => arg.startsWith('--limit='))
  const limit = limitArg ? Number(limitArg.split('=')[1]) : undefined
  return {
    dryRun,
    limit: Number.isFinite(limit) ? limit : undefined,
  }
}

async function main() {
  const options = parseOptions(process.argv.slice(2))

  const contacts = await prisma.contact.findMany({
    where: { ownerUserId: null },
    select: { id: true, name: true },
    orderBy: { createdAt: 'asc' },
    take: options.limit,
  })

  let updated = 0
  let skipped = 0

  for (const contact of contacts) {
    const relations = await prisma.customerContact.findMany({
      where: {
        contactId: contact.id,
        status: 1,
      },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'asc' },
      ],
      include: {
        customer: {
          select: { followUserId: true },
        },
      },
    })

    const ownerUserId = relations.find((relation) => relation.customer.followUserId)?.customer
      .followUserId

    if (!ownerUserId) {
      skipped += 1
      continue
    }

    if (!options.dryRun) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: { ownerUserId },
      })
    }

    updated += 1
  }

  console.log('[backfill-contact-owner] done')
  console.log(`total=${contacts.length}`)
  console.log(`updated=${updated}`)
  console.log(`skipped=${skipped}`)
  console.log(`dryRun=${options.dryRun}`)
}

main()
  .catch((error) => {
    console.error('[backfill-contact-owner] failed', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

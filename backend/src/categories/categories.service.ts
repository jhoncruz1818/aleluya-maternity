import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { slugify } from '../common/utils/slugify';
import {
  PUBLIC_LIST_TTL_MS,
  categoriesCache,
} from '../common/utils/ttl-cache';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);

    await this.ensureUnique(dto.name, slug);

    const created = await this.prisma.category.create({
      data: {
        name: dto.name.trim(),
        slug,
        description: dto.description,
      },
    });
    categoriesCache.invalidatePrefix('categories:');
    return created;
  }

  async findAll() {
    const cacheKey = 'categories:list';
    const cached = categoriesCache.get<
      Awaited<ReturnType<CategoriesService['findAllUncached']>>
    >(cacheKey);
    if (cached) return cached;

    const data = await this.findAllUncached();
    categoriesCache.set(cacheKey, data, PUBLIC_LIST_TTL_MS);
    return data;
  }

  private findAllUncached() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { products: true } },
      },
    });
  }

  async findOne(idOrSlug: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);

    const slug = dto.slug
      ? slugify(dto.slug)
      : dto.name
        ? slugify(dto.name)
        : undefined;

    if (dto.name || slug) {
      await this.ensureUnique(dto.name, slug, id);
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        slug,
        description: dto.description,
      },
    });
    categoriesCache.invalidatePrefix('categories:');
    return updated;
  }

  async remove(id: string) {
    const category = await this.findOne(id);

    if (category._count.products > 0) {
      // Evitamos dejar productos huérfanos (FK NoAction en SQL Server)
      throw new BadRequestException(
        'No se puede eliminar: la categoría tiene productos asociados',
      );
    }

    await this.prisma.category.delete({ where: { id } });
    categoriesCache.invalidatePrefix('categories:');
    return { message: 'Categoría eliminada' };
  }

  private async ensureUnique(name?: string, slug?: string, excludeId?: string) {
    if (name) {
      const byName = await this.prisma.category.findFirst({
        where: {
          name: name.trim(),
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
      });
      if (byName) {
        throw new ConflictException('Ya existe una categoría con ese nombre');
      }
    }

    if (slug) {
      const bySlug = await this.prisma.category.findFirst({
        where: {
          slug,
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
      });
      if (bySlug) {
        throw new ConflictException('Ya existe una categoría con ese slug');
      }
    }
  }
}

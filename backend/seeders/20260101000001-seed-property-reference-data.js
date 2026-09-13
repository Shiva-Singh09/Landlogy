const propertyTypes = [
  {
    name: 'Residential Apartment',
    slug: 'residential-apartment',
    description: 'Flat or apartment in a residential complex',
    is_active: true,
  },
  {
    name: 'Independent House / Villa',
    slug: 'independent-house-villa',
    description: 'Standalone house, villa, or bungalow',
    is_active: true,
  },
  {
    name: 'Plot / Land',
    slug: 'plot-land',
    description: 'Residential or agricultural plot of land',
    is_active: true,
  },
  {
    name: 'Commercial Space',
    slug: 'commercial-space',
    description: 'Shop, showroom, or retail space',
    is_active: true,
  },
  {
    name: 'Office Space',
    slug: 'office-space',
    description: 'Commercial office or workspace',
    is_active: true,
  },
  {
    name: 'Warehouse / Industrial',
    slug: 'warehouse-industrial',
    description: 'Warehouse, factory, or industrial property',
    is_active: true,
  },
];

const propertyCategories = [
  {
    name: 'Residential',
    slug: 'residential',
    description: 'Homes, apartments, villas, and residential plots',
    is_active: true,
  },
  {
    name: 'Commercial',
    slug: 'commercial',
    description: 'Shops, offices, and retail spaces',
    is_active: true,
  },
  {
    name: 'Land',
    slug: 'land',
    description: 'Plots, agricultural land, and undeveloped parcels',
    is_active: true,
  },
  {
    name: 'Industrial',
    slug: 'industrial',
    description: 'Warehouses, factories, and industrial facilities',
    is_active: true,
  },
];

export default {
  async up({ context: queryInterface }) {
    const { PropertyType, PropertyCategory } = queryInterface.sequelize.models;

    for (const pt of propertyTypes) {
      const [record, created] = await PropertyType.findOrCreate({
        where: { slug: pt.slug },
        defaults: pt,
      });
      if (created) {
        console.log(`[SEED] Created property_type: ${pt.name}`);
      } else {
        console.log(`[SEED] Skipped property_type (exists): ${pt.name}`);
      }
    }

    for (const pc of propertyCategories) {
      const [record, created] = await PropertyCategory.findOrCreate({
        where: { slug: pc.slug },
        defaults: pc,
      });
      if (created) {
        console.log(`[SEED] Created property_category: ${pc.name}`);
      } else {
        console.log(`[SEED] Skipped property_category (exists): ${pc.name}`);
      }
    }
  },

  async down({ context: queryInterface }) {
    const { PropertyType, PropertyCategory } = queryInterface.sequelize.models;

    await PropertyType.destroy({
      where: { slug: propertyTypes.map((p) => p.slug) },
    });
    await PropertyCategory.destroy({
      where: { slug: propertyCategories.map((p) => p.slug) },
    });
  },
};

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

// Seed script to create demo data
export async function GET(request: NextRequest) {
  try {
    // Check if already seeded
    const existingAdmin = await db.user.findUnique({
      where: { email: 'admin@kqs.com' },
    });

    if (existingAdmin) {
      return Response.json({ message: 'Database already seeded', users: 1 });
    }

    // Create demo company
    const company = await db.company.create({
      data: {
        name: 'Demo Restaurant Chain',
        slug: 'demo-restaurants',
        email: 'info@demo-restaurants.com',
        phone: '+1-555-0123',
        address: '123 Main Street',
        city: 'New York',
        country: 'USA',
        isActive: true,
        plan: 'professional',
        maxBranches: 10,
      },
    });

    // Create demo branches
    const branch1 = await db.branch.create({
      data: {
        companyId: company.id,
        name: 'Downtown Location',
        code: 'DT',
        email: 'downtown@demo-restaurants.com',
        phone: '+1-555-0124',
        address: '456 Downtown Ave',
        city: 'New York',
        isActive: true,
        opensAt: '08:00',
        closesAt: '22:00',
      },
    });

    const branch2 = await db.branch.create({
      data: {
        companyId: company.id,
        name: 'Uptown Location',
        code: 'UT',
        email: 'uptown@demo-restaurants.com',
        phone: '+1-555-0125',
        address: '789 Uptown Blvd',
        city: 'New York',
        isActive: true,
        opensAt: '09:00',
        closesAt: '23:00',
      },
    });

    // Create demo categories
    const category1 = await db.category.create({
      data: {
        companyId: company.id,
        name: 'Appetizers',
        description: 'Starters and appetizers',
        color: '#10b981',
        icon: 'salad',
        sortOrder: 1,
      },
    });

    const category2 = await db.category.create({
      data: {
        companyId: company.id,
        name: 'Main Courses',
        description: 'Main dishes and entrees',
        color: '#3b82f6',
        icon: 'utensils',
        sortOrder: 2,
      },
    });

    const category3 = await db.category.create({
      data: {
        companyId: company.id,
        name: 'Desserts',
        description: 'Sweet treats and desserts',
        color: '#f59e0b',
        icon: 'cake',
        sortOrder: 3,
      },
    });

    // Create demo dishes
    const dish1 = await db.dish.create({
      data: {
        companyId: company.id,
        categoryId: category1.id,
        name: 'Caesar Salad',
        description: 'Fresh romaine lettuce with caesar dressing',
        sku: 'APP-001',
        prepTime: 10,
        isActive: true,
      },
    });

    const dish2 = await db.dish.create({
      data: {
        companyId: company.id,
        categoryId: category2.id,
        name: 'Grilled Salmon',
        description: 'Atlantic salmon with seasonal vegetables',
        sku: 'MAIN-001',
        prepTime: 20,
        isActive: true,
      },
    });

    const dish3 = await db.dish.create({
      data: {
        companyId: company.id,
        categoryId: category2.id,
        name: 'Ribeye Steak',
        description: '12oz ribeye steak with mashed potatoes',
        sku: 'MAIN-002',
        prepTime: 25,
        isActive: true,
      },
    });

    const dish4 = await db.dish.create({
      data: {
        companyId: company.id,
        categoryId: category3.id,
        name: 'Chocolate Lava Cake',
        description: 'Warm chocolate cake with molten center',
        sku: 'DES-001',
        prepTime: 15,
        isActive: true,
      },
    });

    // Create checklist items for dishes
    await db.qualityChecklistItem.createMany({
      data: [
        { dishId: dish1.id, name: 'Presentation', type: 'SCORE_1_5', isRequired: true, weight: 1.0, sortOrder: 1 },
        { dishId: dish1.id, name: 'Temperature', type: 'BOOLEAN', isRequired: true, weight: 1.0, sortOrder: 2 },
        { dishId: dish1.id, name: 'Portion Size', type: 'SCORE_1_5', isRequired: true, weight: 1.0, sortOrder: 3 },
        { dishId: dish1.id, name: 'Freshness', type: 'SCORE_1_5', isRequired: true, weight: 1.5, sortOrder: 4 },
        
        { dishId: dish2.id, name: 'Presentation', type: 'SCORE_1_5', isRequired: true, weight: 1.0, sortOrder: 1 },
        { dishId: dish2.id, name: 'Internal Temperature', type: 'NUMERIC', isRequired: true, weight: 2.0, minValue: 54, maxValue: 60, passingScore: 55, sortOrder: 2 },
        { dishId: dish2.id, name: 'Seasoning', type: 'SCORE_1_5', isRequired: true, weight: 1.0, sortOrder: 3 },
        { dishId: dish2.id, name: 'Side Dish Quality', type: 'SCORE_1_5', isRequired: true, weight: 1.0, sortOrder: 4 },
        
        { dishId: dish3.id, name: 'Presentation', type: 'SCORE_1_5', isRequired: true, weight: 1.0, sortOrder: 1 },
        { dishId: dish3.id, name: 'Internal Temperature', type: 'NUMERIC', isRequired: true, weight: 2.0, minValue: 54, maxValue: 71, passingScore: 55, sortOrder: 2 },
        { dishId: dish3.id, name: 'Doneness (per order)', type: 'SCORE_1_5', isRequired: true, weight: 1.5, sortOrder: 3 },
        { dishId: dish3.id, name: 'Resting Time', type: 'BOOLEAN', isRequired: true, weight: 1.0, sortOrder: 4 },
        
        { dishId: dish4.id, name: 'Presentation', type: 'SCORE_1_5', isRequired: true, weight: 1.0, sortOrder: 1 },
        { dishId: dish4.id, name: 'Center Molten', type: 'BOOLEAN', isRequired: true, weight: 2.0, sortOrder: 2 },
        { dishId: dish4.id, name: 'Temperature', type: 'SCORE_1_5', isRequired: true, weight: 1.0, sortOrder: 3 },
      ],
    });

    // Hash passwords
    const adminPassword = await hashPassword('admin123');
    const companyPassword = await hashPassword('company123');
    const managerPassword = await hashPassword('manager123');
    const supervisorPassword = await hashPassword('super123');

    // Create demo users
    await db.user.createMany({
      data: [
        {
          email: 'admin@kqs.com',
          password: adminPassword,
          name: 'System Administrator',
          role: 'SUPER_ADMIN',
          isActive: true,
        },
        {
          email: 'company@kqs.com',
          password: companyPassword,
          name: 'Company Admin',
          role: 'COMPANY_ADMIN',
          companyId: company.id,
          isActive: true,
        },
        {
          email: 'manager@kqs.com',
          password: managerPassword,
          name: 'Branch Manager',
          role: 'BRANCH_MANAGER',
          companyId: company.id,
          branchId: branch1.id,
          isActive: true,
        },
        {
          email: 'supervisor@kqs.com',
          password: supervisorPassword,
          name: 'Quality Supervisor',
          role: 'SUPERVISOR',
          companyId: company.id,
          branchId: branch1.id,
          isActive: true,
        },
      ],
    });

    // Create some sample quality reports
    const supervisor = await db.user.findUnique({
      where: { email: 'supervisor@kqs.com' },
    });

    if (supervisor) {
      // Create a few sample reports
      const report1 = await db.qualityReport.create({
        data: {
          branchId: branch1.id,
          dishId: dish2.id,
          userId: supervisor.id,
          shift: 'LUNCH',
          evaluationDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
          status: 'APPROVED',
          overallScore: 92,
          exitTime: 18,
          notes: 'Excellent presentation and temperature.',
        },
      });

      const report2 = await db.qualityReport.create({
        data: {
          branchId: branch1.id,
          dishId: dish3.id,
          userId: supervisor.id,
          shift: 'DINNER',
          evaluationDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          status: 'REJECTED',
          overallScore: 45,
          exitTime: 35,
          notes: 'Overcooked - not medium-rare as requested.',
        },
      });

      // Create sample incident
      await db.incident.create({
        data: {
          branchId: branch1.id,
          dishId: dish3.id,
          qualityReportId: report2.id,
          userId: supervisor.id,
          incidentType: 'Overcooked',
          description: 'Steak was overcooked, customer complaint received.',
          severity: 'high',
          status: 'PENDING',
        },
      });
    }

    return Response.json({
      success: true,
      message: 'Database seeded successfully',
      data: {
        company: company.name,
        branches: 2,
        categories: 3,
        dishes: 4,
        users: 4,
      },
    });
  } catch (error) {
    console.error('Seed error:', error);
    return Response.json({ error: 'Failed to seed database' }, { status: 500 });
  }
}

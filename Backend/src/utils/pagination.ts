export const getPagination = (query: any) => {
  const page = parseInt(query.page as string) || 1;
  const limit = parseInt(query.limit as string) || 20;
  const skip = (page - 1) * limit;
  const orderBy = { [query.sort as string || 'createdAt']: query.order || 'desc' };
  
  return { skip, take: limit, orderBy };
};
const getPagination = async (
    model,
    page = 1,
    itemsPerPage = 8,
    filter = {}
) => {

    page = parseInt(page);
    itemsPerPage = parseInt(itemsPerPage);

    const totalItems = await model.countDocuments(filter);

    return {

        currentPage: page,

        itemsPerPage,

        totalPages: Math.ceil(totalItems / itemsPerPage),

        skip: (page - 1) * itemsPerPage

    };
};

module.exports= getPagination;
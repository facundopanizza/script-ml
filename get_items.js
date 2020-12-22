const axios = require('axios');
const minimist = require('minimist');
const fs = require('fs');
const { off } = require('process');

const args = minimist(process.argv.slice(2), {
  alias: {
    h: 'help',
    s: 'seller_id',
    i: 'site_id',
    o: 'offset',
    a: 'all',
  },
});

const get_categories = async (site_id) => {
  const response = await axios.get(
    `https://api.mercadolibre.com/sites/${site_id}/categories`
  );

  return response.data;
};

const get_items = async (seller_id, site_id, offset) => {
  let url = `https://api.mercadolibre.com/sites/${site_id}/search?seller_id=${seller_id}`;

  let response;

  if (offset) {
    response = await axios.get(`${url}&offset=${offset}`);
  } else {
    response = await axios.get(url);
  }

  return response.data;
};

const write_items_in_file = (
  items,
  categories,
  site_id,
  seller_id,
  file_name
) => {
  let output = '';

  items.forEach((item) => {
    categories.forEach((category) => (item.category_name = category.name));

    output += `${item.id} - ${item.title} - ${item.category_id} - ${item.category_name}\n`;
  });

  if (!file_name) {
    file_name = `${Date.now().toString()}_${site_id}_${seller_id}.log`;
  }

  fs.writeFile(file_name, output, (err) => {
    if (err) return console.error(err);
  });
};

(async () => {
  let seller_id = '179571326';
  let site_id = 'MLA';
  let offset = 0;

  if (args.h) {
    console.log(
      `Usage: get_items [arguments] 
      Options:
      -h, --help        Display this message
      -s, --seller_id   Specify the seller_id value, you can put more than one seller_id by separating each other with a comma. Example: 123,432,4123
      -i, --site_id     Specify the site_id value
      -o, --offset      Speicfy the offset for pagination
      -a, --all         Get all items`
    );
    return;
  }

  if (args.s) {
    seller_id = args.s;
  }

  if (args.i) {
    site_id = args.i;
  }

  if (args.o) {
    offset = args.o;
  }

  const categories = await get_categories(site_id);
  const sellers_id = seller_id.split(',');

  if (args.a) {
    sellers_id.forEach(async (id) => {
      let { results: items, paging } = await get_items(id, site_id);
      file_name = `${Date.now().toString()}_${site_id}_${seller_id}.log`;

      while (offset < paging.total) {
        let { results: items_to_add } = await get_items(id, site_id, offset);
        items = [...items, ...items_to_add];
        offset += 50;
      }

      write_items_in_file(items, categories, site_id, id);
    });
  } else {
    sellers_id.forEach(async (id) => {
      let { results: items } = await get_items(id, site_id, offset);

      write_items_in_file(items, categories, site_id, id);
    });
  }
})();

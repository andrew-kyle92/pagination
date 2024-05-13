# About
Pagination contains javascript code that will format an HTML table to be used with pagination. This README will show you how to configure and use the script.

# Configration
### Django/Flask:
Create a dictionary object, within your `settings.py` file, called `PAGINATION` with keys: `amount`, `data`, `data_category`, and `pages`. You can add more keys if your project calls for it.
```
    PAGINATION = {
        'amount': 10,  # number shown per page
        'data': None,  # a raw dictionary of the data to be paginated
        'data_category': None,  # this is optional but helps with knowing which  category of data is being used
        'pages': None,  # the amount of pages created from the dataset queried and amount of pages shown per page
    }
```
When creating a view that will show paginated data, you want to add the pagination data to the session (`request.session[PAGINATION]`). In pagination.js, there are fetch calls that receive and update the pagination session data.

You also need to create serializers.py file that will contain serialized classes for each model. A suggested library to use is `djangorestframework`

### serializers.py Example:
```
from rest_framework import serializers
from .models import *


class SongsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Songs
        fields = ['id', 'name', 'track_no']  # Use which ever fields; if using all fields, user string '__all__'
        depth = 1  # depth is optional, but I like to use it especially if there's a foreign key that you will need to utilize the relational table's data
```
For more information regarding djangorestframework serializers refer to this link:
[Model Serializers](https://www.django-rest-framework.org/api-guide/serializers/#modelserializer)

### Full view example:
```
from django.conf import settings
from .serializers import SongsSerializer
...
def index(request):
    ...
    # Adding pagination data to session
    song_data = Model.objects.all()
    s = SongSerializer()
    serialized_data = s(song_data, many=True).data 
    # the many argument is used when multiple instances are being serialized.
    # '.data' will format it into the outgoing representation (dictionary format)
    # now add the serialized data to the session
    pagination = settings.PAGINATION
    pagination['data'] = serialized_data
    pagination['data_category'] = 'Songs'
    request.session['PAGINATION] = pagination

    return render(request, template, context)

```

## HTML configuration
### Concept db data
```
# Table: songs
# Columns: id, name, track_no, album_id, artist_id, song_file
# Rows:
2, Unholy Confessions, 2, 2, 1, /path/to/song/unholy_confessions.mp3
3, Chapter Four, 3, 2, 1, /path/to/song/chapter_four.mp3
7, Second Heartbeat, 7, 2, 1, /path/to/song/second_heartbeat.mp3

# Table: artists
# Columns: id, name, year_formed
# Rows:
1, Avenged Sevenfold, 1999

# Table: albums
# Columns: id, name, year_released, artwork, label
# Rows:
2, Waking the Fallen, 2003, /path/to/album_art.png, Hopeless
```
### Configuring the table
Within the table we will make use of the `data` attribute. Below are a list of the data attributes we will be creating.
- `data-column`: added to the `<th>` element which identifies the database column(s) (verbatim) as it will be used in a fetch view to asyncronously find the column(s) by name. This attribute can also contain multiple column names, separated by the semi-colon: `;`.
    ```
     <th data-column='id;track_no'>...</th>
    ```
- `data-format`: added to the `<th>` element which identifies how the column text will be formatted according to the string in the formart attribute. The string will contain the column name(s) within `data-column`, which will act as variables. The order of which the variables will be used, counting from 0, by how they are writted.
    ```
    # Example 1
    <th data-column='name;track_no' data-format='-1- - -0-'>...</th>

    # output
    >2 - Song 1

    # Example 2
    <th format-column='artist_id.name;name' data-format='-0- - -1-'>...</th>

    # output
    >Avenged Sevenfold - Second Heartbeat
    ```
    The first column name is -0- with the next one counting in consecutive order. This is also where the serializer depth comes into play; any table with a with foreign keys that are serialized with a depth of 1, the foreign key column's primary table will become a nested dictionary as the value.
    
    Example
    ```
    # using the songs table
    # this is what the data-structue looks like of a serialized model-object
    song = {
        'id': 3,
        'name': 'Chapter Four',
        'track_no': 3,
        'album_id': {
            'id': 2,
            'name': 'Waking the Fallen',
            'year_released': '2003',
            'artwork': '/path/to/album_art.png',
            'label': 'Hopeless'
        },
        'artist_id': {
            'id': '1',
            'name': 'Avenged Sevenfold',
            'year_formed': '1999'
        },
        'song_file': '/path/to/song/chapter_four.mp3'
    }

    # in HTML
    # Example
    <th format-column='artist_id.name;name' data-format='-1- (-0-)'>...</th>

    # output
    >Chapter Four (Avenged Sevenfold)
    ```
    The pagination script will know the dot `.` is used for foreign keys and will iterate through the nested dictionary to find the value.
- `data-contains-date`: added to the `th`. If `'true'` will tell **pagination.js** to format the date using js dates. If the column doesn't contain a date, just omit the data attribute. Added to the child element value of `th`.
- `data-filter-by`: the database column that will be used as the filter when making the query. Added to the child element value of `th`.
- `data-direction`: the sort_by direction; which will either be `asc` or `desc`.
- `data-current-filter`: will either return `'true'` or `'false'`. Return true if the table is currently being filtered by the selected header. Added to the child element value of `th`.

The value of `th` can be `p`, `span`, `h*`, or whatever can be added within the `th`. The only thing is that it needs the classname `header-link`. Pagination.js will be using that classname when it parses the data attributes for filter information.

Example
```
<th data-column='id'><span class='header-link' data-filter-by="id" data-direction="asc" data-current-filter="true">ID</span></th>
```

### Page sifting, amount per page setter, # of pages out of max
Classes that will need to be added within te html page with pagination: `pagination` or `pagination-with-bs`, `item-amount-setter`, `show-amount`, `page-links`, `page-numbers`, `total-page-count`, `max-page-count`.

Example with all the classes and some added bootstrap classes for styling:
```
{# ---------- Pagination html ---------- #}
    <div id="pagination-with-bs" class="container">
        <div class="row justify-content-evenly">
            <div id="item-amount-setter" class="col d-flex justify-content-start">
                <label class="me-1" for="show-amount">Show</label>
                <select id="page-select" name="show-amount">
                    <option value="5">5</option>
                    <option value="10" selected>10</option>
                    <option value="15">15</option>
                    <option value="30">30</option>
                    <option value="50">50</option>
                    <option value="all">All</option>
                </select>
            </div>
            <div id="page-links" class="col justify-content-center">
                <span role="button" class="arrow-btn align-middle" id="page-left">&laquo; previous</span>
                <div id="page-numbers"></div>
                <span role="button" class="arrow-btn align-middle" id="page-right">next &raquo;</span>
            </div>
            <div id="total-page-count" class="col d-flex justify-content-end">
                <span id="current-page-number" class="me-1"></span>
                of
                <span id="max-page-number" class="ms-1"></span>
            </div>
        </div>
    </div>
```

You are more than welcome to use your own classnames, but you will also have to change them throughout the script. I recommend to use the already used names.